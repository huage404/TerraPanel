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

  @ApiProperty({ description: '1=小, 2=中, 3=大' })
  worldSize: number;

  @ApiProperty()
  worldSeed: string;

  @ApiProperty({ description: '0=普通, 1=专家, 2=大师, 3=旅途' })
  worldDifficulty: number;

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
