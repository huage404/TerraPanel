import { Module } from '@nestjs/common';
import { AppConfigModule } from '../config/config.module';
import { InstallService } from './install.service';
import { ProcessManagerService } from './process-manager.service';
import { TerrariaController } from './terraria.controller';
import { TerrariaService } from './terraria.service';

@Module({
  imports: [AppConfigModule],
  controllers: [TerrariaController],
  providers: [TerrariaService, ProcessManagerService, InstallService],
  exports: [TerrariaService, ProcessManagerService],
})
export class TerrariaModule {}
