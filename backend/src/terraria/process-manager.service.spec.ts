import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppConfigService } from '../config/config.service';
import { ProcessManagerService } from './process-manager.service';
import { ServerConfigService } from './server-config.service';

describe('ProcessManagerService', () => {
  let service: ProcessManagerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [EventEmitterModule.forRoot()],
      providers: [
        ProcessManagerService,
        ServerConfigService,
        {
          provide: ServerConfigService,
          useValue: {
            resolveWorldPath: jest
              .fn()
              .mockReturnValue('/tmp/worlds/world.wld'),
            writeConfig: jest.fn().mockResolvedValue('/tmp/serverconfig.txt'),
          },
        },
        {
          provide: AppConfigService,
          useValue: {
            isInstalled: jest.fn().mockResolvedValue(false),
            isInstalledSync: jest.fn().mockReturnValue(false),
            getExecutablePath: jest.fn().mockReturnValue('/tmp/TerrariaServer'),
            getInstallPath: jest.fn().mockReturnValue('/tmp'),
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
          },
        },
      ],
    }).compile();

    service = module.get(ProcessManagerService);
  });

  it('should return stopped status by default', () => {
    const status = service.getStatusSnapshot();
    expect(status.status).toBe('stopped');
    expect(status.playerCount).toBe(0);
    expect(status.port).toBe(7777);
  });

  it('should keep logs empty initially', () => {
    expect(service.getLogs()).toEqual([]);
  });
});
