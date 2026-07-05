import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/api/terraria/status (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/terraria/status')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          status: 'stopped',
          installed: false,
        });
      });
  });

  it('/api/config (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/config')
      .expect(200)
      .expect(({ body }) => {
        expect(body.serverPort).toBe(7777);
        expect(body.maxPlayers).toBe(8);
      });
  });
});
