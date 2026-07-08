import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { InstanceController } from './instance.controller';
import { InstanceManagerService } from './instance-manager.service';
import { InstallService } from './install.service';
import { ServerConfigService } from './server-config.service';
import { TerrariaController } from './terraria.controller';
import { TerrariaService } from './terraria.service';
import { WorldController } from './world.controller';
import { WorldService } from './world.service';

@Module({
  imports: [AppConfigModule],
  controllers: [TerrariaController, InstanceController, WorldController],
  providers: [
    TerrariaService,
    InstanceManagerService,
    InstallService,
    ServerConfigService,
    WorldService,
  ],
  exports: [TerrariaService, InstanceManagerService],
})
export class TerrariaModule {}
