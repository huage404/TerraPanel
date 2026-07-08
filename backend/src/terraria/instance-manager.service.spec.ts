import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { AppConfigService } from '../config/config.service';
import { InstanceManagerService } from './instance-manager.service';
import { ServerConfigService } from './server-config.service';

describe('InstanceManagerService', () => {
  let service: InstanceManagerService;
  let dataPath: string;

  const appConfigService = {
    isInstalled: jest.fn().mockResolvedValue(false),
    isInstalledSync: jest.fn().mockReturnValue(false),
    getExecutablePath: jest.fn().mockReturnValue('/tmp/TerrariaServer'),
    getInstallPath: jest.fn().mockReturnValue('/tmp'),
    getDataPath: jest.fn(),
    getRuntimeConfig: jest.fn().mockReturnValue({
      serverPort: 7777,
      maxPlayers: 8,
      worldPath: '',
      worldName: 'world',
      worldSize: 2,
      worldSeed: '',
      worldDifficulty: 0,
      password: '',
      motd: 'test',
      dataPath: '/tmp',
    }),
    getPortRange: jest.fn().mockReturnValue({ portStart: 7777, portEnd: 7799 }),
  };

  beforeEach(async () => {
    dataPath = await mkdtemp(join(tmpdir(), 'terrapanel-instances-'));
    appConfigService.getDataPath.mockReturnValue(dataPath);

    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        InstanceManagerService,
        ServerConfigService,
        { provide: AppConfigService, useValue: appConfigService },
      ],
    }).compile();

    service = module.get(InstanceManagerService);
    await service.onModuleInit();
  });

  afterEach(async () => {
    await rm(dataPath, { recursive: true, force: true });
    jest.clearAllMocks();
  });

  it('returns aggregate stopped status when no instances exist', () => {
    const status = service.getAggregateStatus();
    expect(status.status).toBe('stopped');
    expect(status.runningCount).toBe(0);
    expect(status.totalInstances).toBe(0);
  });

  it('lists empty instances initially', () => {
    expect(service.getAllStatuses()).toEqual([]);
  });
});
