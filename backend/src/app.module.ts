import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { CommonModule } from './common/common.module';
import { AppConfigModule } from './config/config.module';
import { TerrariaModule } from './terraria/terraria.module';
import { TerminalModule } from './terminal/terminal.module';

const publicPath = join(__dirname, '..', 'public');
const serveFrontend = existsSync(join(publicPath, 'index.html'));

@Module({
  imports: [
    EventEmitterModule.forRoot(),
    CommonModule,
    AppConfigModule,
    TerrariaModule,
    TerminalModule,
    ...(serveFrontend
      ? [
          ServeStaticModule.forRoot({
            rootPath: publicPath,
            exclude: ['/api/*path', '/socket.io/*path'],
          }),
        ]
      : []),
  ],
})
export class AppModule {}
