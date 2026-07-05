import { ApiProperty } from '@nestjs/swagger';

export class ConfigResponseDto {
  @ApiProperty()
  installPath: string;

  @ApiProperty()
  dataPath: string;

  @ApiProperty()
  executable: string;

  @ApiProperty()
  downloadUrl: string;

  @ApiProperty()
  serverPort: number;

  @ApiProperty()
  maxPlayers: number;

  @ApiProperty()
  worldPath: string;

  @ApiProperty()
  worldName: string;

  @ApiProperty()
  password: string;

  @ApiProperty()
  motd: string;

  @ApiProperty()
  autoSaveMinutes: number;

  @ApiProperty()
  installed: boolean;

  @ApiProperty()
  executablePath: string;
}
