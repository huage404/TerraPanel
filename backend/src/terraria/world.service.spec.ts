import AdmZip from 'adm-zip';
import { Test, TestingModule } from '@nestjs/testing';
import { access, mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppConfigService } from '../config/config.service';
import { InstanceManagerService } from './instance-manager.service';
import { WORLD_EXPORT_META_FILENAME } from './world-export-meta';
import { WorldService } from './world.service';

describe('WorldService', () => {
  let service: WorldService;
  let dataPath: string;

  const instanceManager = {
    findByWorldPath: jest.fn(),
    findConfigByWorldPath: jest.fn(),
    createInstance: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    restart: jest.fn(),
    deleteInstance: jest.fn(),
    getOrCreateForWorld: jest.fn(),
    suggestPort: jest.fn(),
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
      password: '',
      motd: 'Welcome',
      worldSize: 2,
      worldSeed: '',
      worldDifficulty: 0,
    });
    instanceManager.findByWorldPath.mockReturnValue(null);
    instanceManager.findConfigByWorldPath.mockReturnValue(null);
    instanceManager.suggestPort.mockImplementation(
      (preferred?: number) => preferred ?? 7777,
    );

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

  it('exports world files with terrapanel meta', async () => {
    const worldsDir = join(dataPath, 'worlds');
    await mkdir(worldsDir, { recursive: true });
    const worldPath = join(worldsDir, 'backup-me.wld');
    await writeFile(worldPath, 'world-data');
    await writeFile(`${worldPath}.bak`, 'backup');

    instanceManager.findConfigByWorldPath.mockReturnValue({
      id: 'instance-1',
      worldPath,
      worldName: 'backup-me',
      port: 7780,
      maxPlayers: 12,
      password: 'secret',
      motd: 'Hello',
      worldSize: 2,
      worldSeed: 'seed',
      worldDifficulty: 1,
      autoSaveMinutes: 10,
    });

    const archive = await service.exportWorld(worldPath);
    const zip = new AdmZip(archive.buffer);
    const names = zip.getEntries().map((entry) => entry.entryName);

    expect(archive.fileName).toMatch(/^backup-me-.+\.zip$/);
    expect(names).toEqual(
      expect.arrayContaining([
        'backup-me.wld',
        'backup-me.wld.bak',
        WORLD_EXPORT_META_FILENAME,
      ]),
    );

    const meta = JSON.parse(
      zip.getEntry(WORLD_EXPORT_META_FILENAME)!.getData().toString('utf-8'),
    );
    expect(meta).toMatchObject({
      version: 1,
      worldName: 'backup-me',
      port: 7780,
      password: 'secret',
    });
  });

  it('rejects export for paths outside worlds directory', async () => {
    await expect(service.exportWorld('/tmp/evil.wld')).rejects.toThrow(
      '无效的世界路径',
    );
  });

  it('imports a raw .wld file and starts instance', async () => {
    await mkdir(join(dataPath, 'worlds'), { recursive: true });
    const worldPath = join(dataPath, 'worlds', 'imported.wld');

    instanceManager.createInstance.mockResolvedValue({
      id: 'instance-import',
      worldPath,
      worldName: 'imported',
      status: 'stopped',
      port: 7778,
    });
    instanceManager.start.mockResolvedValue({
      id: 'instance-import',
      status: 'starting',
    });

    const result = await service.importWorld(
      {
        buffer: Buffer.from('imported-world'),
        originalname: 'source.wld',
        mimetype: 'application/octet-stream',
      } as Express.Multer.File,
      { worldName: 'imported', port: 7778 },
    );

    await expect(access(worldPath)).resolves.toBeUndefined();
    expect(await readFile(worldPath, 'utf-8')).toBe('imported-world');
    expect(instanceManager.suggestPort).toHaveBeenCalledWith(7778);
    expect(instanceManager.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        worldPath,
        worldName: 'imported',
        port: 7778,
        allowMissingWorld: false,
      }),
    );
    expect(result.instance?.id).toBe('instance-import');
  });

  it('imports zip with meta and related bak file', async () => {
    await mkdir(join(dataPath, 'worlds'), { recursive: true });
    const worldPath = join(dataPath, 'worlds', 'from-zip.wld');

    const zip = new AdmZip();
    zip.addFile('old-name.wld', Buffer.from('zip-world'));
    zip.addFile('old-name.wld.bak', Buffer.from('zip-bak'));
    zip.addFile(
      WORLD_EXPORT_META_FILENAME,
      Buffer.from(
        JSON.stringify({
          version: 1,
          exportedAt: new Date().toISOString(),
          worldName: 'old-name',
          port: 7799,
          password: 'from-meta',
          motd: 'Imported MOTD',
          maxPlayers: 16,
        }),
      ),
    );

    instanceManager.createInstance.mockResolvedValue({
      id: 'instance-zip',
      worldPath,
      worldName: 'from-zip',
      status: 'stopped',
      port: 7799,
    });
    instanceManager.start.mockResolvedValue({
      id: 'instance-zip',
      status: 'starting',
    });

    await service.importWorld(
      {
        buffer: zip.toBuffer(),
        originalname: 'old-name.zip',
        mimetype: 'application/zip',
      } as Express.Multer.File,
      { worldName: 'from-zip' },
    );

    expect(await readFile(worldPath, 'utf-8')).toBe('zip-world');
    expect(await readFile(`${worldPath}.bak`, 'utf-8')).toBe('zip-bak');
    expect(instanceManager.suggestPort).toHaveBeenCalledWith(7799);
    expect(instanceManager.createInstance).toHaveBeenCalledWith(
      expect.objectContaining({
        worldName: 'from-zip',
        password: 'from-meta',
        motd: 'Imported MOTD',
        maxPlayers: 16,
        allowMissingWorld: false,
      }),
    );
  });

  it('rejects import when world name already exists', async () => {
    const worldsDir = join(dataPath, 'worlds');
    await mkdir(worldsDir, { recursive: true });
    await writeFile(join(worldsDir, 'exists.wld'), 'existing');

    await expect(
      service.importWorld(
        {
          buffer: Buffer.from('new'),
          originalname: 'exists.wld',
          mimetype: 'application/octet-stream',
        } as Express.Multer.File,
        { worldName: 'exists' },
      ),
    ).rejects.toThrow('已存在');
  });
});
