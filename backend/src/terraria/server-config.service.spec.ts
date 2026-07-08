import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import type { InstanceConfig } from '../common/interfaces/instance-config.interface';
import { AppConfigService } from '../config/config.service';
import { ServerConfigService } from './server-config.service';

describe('ServerConfigService', () => {
  let service: ServerConfigService;
  let dataPath: string;

  const sampleInstance: InstanceConfig = {
    id: 'test-instance-id',
    worldPath: '',
    worldName: 'test-world',
    port: 7778,
    maxPlayers: 8,
    password: 'secret',
    motd: 'Hello TerraPanel',
    worldSize: 2,
    worldSeed: 'AwesomeSeed',
    worldDifficulty: 1,
    autoSaveMinutes: 10,
  };

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), 'terrapanel-config-'));
    sampleInstance.worldPath = join(dataPath, 'worlds', 'test-world.wld');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServerConfigService,
        {
          provide: AppConfigService,
          useValue: {
            getDataPath: jest.fn().mockReturnValue(dataPath),
            getRuntimeConfig: jest.fn().mockReturnValue({
              dataPath,
              worldPath: '',
              worldName: 'test-world',
              worldSize: 2,
              worldSeed: 'AwesomeSeed',
              worldDifficulty: 1,
              serverPort: 7777,
              maxPlayers: 8,
              motd: 'Hello TerraPanel',
              password: 'secret',
            }),
          },
        },
      ],
    }).compile();

    service = module.get(ServerConfigService);
  });

  afterEach(async () => {
    await rm(dataPath, { recursive: true, force: true });
  });

  it('writes per-instance Terraria serverconfig.txt', async () => {
    const configPath = await service.writeInstanceConfig(sampleInstance);
    const content = await readFile(configPath, 'utf-8');

    expect(configPath).toBe(
      join(dataPath, 'instances', 'test-instance-id', 'serverconfig.txt'),
    );
    expect(content).toContain(`world=${sampleInstance.worldPath}`);
    expect(content).toContain('port=7778');
    expect(content).toContain('autocreate=2');
    expect(content).toContain('seed=AwesomeSeed');
    expect(content).toContain('difficulty=1');
    expect(content).toContain('worldname=test-world');
    expect(content).toContain('password=secret');
  });

  it('writes legacy global serverconfig.txt from runtime settings', async () => {
    const configPath = await service.writeConfig();
    const content = await readFile(configPath, 'utf-8');

    expect(configPath).toBe(join(dataPath, 'serverconfig.txt'));
    expect(content).toContain(`world=${join(dataPath, 'worlds', 'test-world.wld')}`);
  });
});

