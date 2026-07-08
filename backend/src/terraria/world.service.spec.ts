import { Test, TestingModule } from '@nestjs/testing';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppConfigService } from '../config/config.service';
import { InstanceManagerService } from './instance-manager.service';
import { WorldService } from './world.service';

describe('WorldService', () => {
  let service: WorldService;
  let dataPath: string;

  const instanceManager = {
    findByWorldPath: jest.fn(),
    createInstance: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    deleteInstance: jest.fn(),
    getOrCreateForWorld: jest.fn(),
    getAggregateStatus: jest.fn().mockReturnValue({
      status: 'stopped',
      installed: true,
      port: 7777,
      playerCount: 0,
      maxPlayers: 8,
      startedAt: null,
      uptimeSeconds: 0,
      pid: null,
      runningCount: 0,
      totalInstances: 0,
      totalPlayerCount: 0,
    }),
  };

  const configService = {
    getRuntimeConfig: jest.fn(),
    getDataPath: jest.fn(),
    isInstalledSync: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), 'terrapanel-worlds-'));
    configService.getDataPath.mockReturnValue(dataPath);
    configService.getRuntimeConfig.mockReturnValue({
      dataPath,
      maxPlayers: 8,
    });
    instanceManager.findByWorldPath.mockReturnValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorldService,
        { provide: AppConfigService, useValue: configService },
        { provide: InstanceManagerService, useValue: instanceManager },
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
  });

  it('creates instance and starts server for new world', async () => {
    instanceManager.createInstance.mockResolvedValue({
      id: 'instance-1',
      worldPath: join(dataPath, 'worlds', 'new-world.wld'),
      worldName: 'new-world',
      status: 'stopped',
      port: 7777,
    });
    instanceManager.start.mockResolvedValue({
      id: 'instance-1',
      status: 'starting',
    });

    const result = await service.createWorld({
      worldName: 'new-world',
      worldSize: 3,
      worldSeed: 'seed',
      worldDifficulty: 1,
    });

    expect(instanceManager.createInstance).toHaveBeenCalledWith({
      worldPath: join(dataPath, 'worlds', 'new-world.wld'),
      worldName: 'new-world',
      worldSize: 3,
      worldSeed: 'seed',
      worldDifficulty: 1,
      allowMissingWorld: true,
    });
    expect(instanceManager.start).toHaveBeenCalledWith('instance-1');
    expect(result.instance?.id).toBe('instance-1');
  });

  it('deletes world files and associated instance', async () => {
    const worldsDir = join(dataPath, 'worlds');
    await mkdir(worldsDir, { recursive: true });
    const worldPath = join(worldsDir, 'remove-me.wld');
    await writeFile(worldPath, 'world-data');
    await writeFile(`${worldPath}.bak`, 'backup');

    instanceManager.findByWorldPath.mockReturnValue({
      id: 'instance-remove',
      status: 'stopped',
    });
    instanceManager.deleteInstance.mockResolvedValue(undefined);

    const result = await service.deleteWorld(worldPath);

    expect(instanceManager.deleteInstance).toHaveBeenCalledWith('instance-remove');
    expect(result.worlds).toHaveLength(0);
  });
});
