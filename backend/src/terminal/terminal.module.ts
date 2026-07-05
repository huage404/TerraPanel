import { Module } from '@nestjs/common';
import { TerrariaModule } from '../terraria/terraria.module';
import { TerminalGateway } from './terminal.gateway';

@Module({
  imports: [TerrariaModule],
  providers: [TerminalGateway],
})
export class TerminalModule {}
