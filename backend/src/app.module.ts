import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { TerrariaModule } from './terraria/terraria.module';
import { TerminalModule } from './terminal/terminal.module';

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CommonModule,
    AppConfigModule,
    TerrariaModule,
    TerminalModule,
  ],
})
export class AppModule {}
