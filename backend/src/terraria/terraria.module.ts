import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { InstallService } from './install.service';
import { ProcessManagerService } from './process-manager.service';
import { ServerConfigService } from './server-config.service';
import { TerrariaController } from './terraria.controller';
import { TerrariaService } from './terraria.service';
import { WorldController } from './world.controller';
import { WorldService } from './world.service';

@Module({
  imports: [AppConfigModule],
  controllers: [TerrariaController, WorldController],
  providers: [
    TerrariaService,
    ProcessManagerService,
    InstallService,
    ServerConfigService,
    WorldService,
  ],
  exports: [TerrariaService, ProcessManagerService],
})
export class TerrariaModule {}
