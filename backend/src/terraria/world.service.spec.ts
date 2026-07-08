import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppConfigService } from '../config/config.service';
import { ProcessManagerService } from './process-manager.service';
import { ServerConfigService } from './server-config.service';
import { WorldService } from './world.service';

describe('WorldService', () => {
  let service: WorldService;
  let dataPath: string;

  const processManager = {
    getStatusSnapshot: jest.fn().mockReturnValue({
      status: 'stopped',
      installed: true,
      port: 7777,
      playerCount: 0,
      maxPlayers: 8,
      startedAt: null,
      uptimeSeconds: 0,
      pid: null,
    }),
    start: jest.fn().mockResolvedValue(undefined),
  };

  const configService = {
    getRuntimeConfig: jest.fn(),
    getDataPath: jest.fn(),
    isInstalledSync: jest.fn().mockReturnValue(true),
    updateRuntimeConfig: jest.fn().mockResolvedValue(undefined),
  };

  const serverConfigService = {
    resolveWorldPath: jest.fn(),
    writeConfig: jest.fn().mockResolvedValue('/tmp/serverconfig.txt'),
  };

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), 'terrapanel-worlds-'));
    configService.getDataPath.mockReturnValue(dataPath);
    configService.getRuntimeConfig.mockReturnValue({
      dataPath,
      worldPath: '',
      worldName: 'alpha',
    });
    serverConfigService.resolveWorldPath.mockImplementation((config) =>
      config.worldPath
        ? config.worldPath
        : join(config.dataPath, 'worlds', `${config.worldName}.wld`),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldService,
        { provide: AppConfigService, useValue: configService },
        { provide: ServerConfigService, useValue: serverConfigService },
        { provide: ProcessManagerService, useValue: processManager },
      ],
    }).compile();

    service = module.get(WorldService);
  });

  afterEach(async () => {
    await rm(dataPath, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('lists worlds from .wld files', async () => {
    const worldsDir = join(dataPath, 'worlds');
    await mkdir(worldsDir, { recursive: true });
    await writeFile(join(worldsDir, 'alpha.wld'), 'world-a');
    await writeFile(join(worldsDir, 'beta.wld'), 'world-b-longer');

    const result = await service.listWorlds();

    expect(result.worlds).toHaveLength(2);
    expect(result.worlds.map((world) => world.worldName).sort()).toEqual([
      'alpha',
      'beta',
    ]);
    expect(result.activeWorldPath).toBe(join(worldsDir, 'alpha.wld'));
  });

  it('creates world config and starts server', async () => {
    const result = await service.createWorld({
      worldName: 'new-world',
      worldSize: 3,
      worldSeed: 'seed',
      worldDifficulty: 1,
    });

    expect(configService.updateRuntimeConfig).toHaveBeenCalledWith({
      worldName: 'new-world',
      worldPath: '',
      worldSize: 3,
      worldSeed: 'seed',
      worldDifficulty: 1,
    });
    expect(serverConfigService.writeConfig).toHaveBeenCalled();
    expect(processManager.start).toHaveBeenCalled();
    expect(result.status.status).toBe('stopped');
  });
});
