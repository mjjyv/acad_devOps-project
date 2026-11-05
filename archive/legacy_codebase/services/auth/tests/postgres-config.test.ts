import { describe, expect, it } from 'vitest';
import { sanitizePostgresConfig, PostgresUserRepository } from '../src/repository/postgres-user-repository.js';

describe('Postgres SSL Configuration & Resilient Fallback Tests', () => {
  it('1. Cấu hình CSDL cục bộ (localhost / 127.0.0.1 / infra-db) không bật SSL', () => {
    const localUrl = 'postgresql://postgres:password@localhost:5432/acad_dev';
    const config = sanitizePostgresConfig(localUrl);
    expect(config.ssl).toBeUndefined();

    const infraUrl = 'postgresql://postgres:password@infra-db:5432/acad_dev';
    const infraConfig = sanitizePostgresConfig(infraUrl);
    expect(infraConfig.ssl).toBeUndefined();
  });

  it('2. Cấu hình có sslmode=disable rõ ràng không bật SSL', () => {
    const disabledUrl = 'postgresql://user:pass@some-remote-db.com:5432/acad_dev?sslmode=disable';
    const config = sanitizePostgresConfig(disabledUrl);
    expect(config.ssl).toBeUndefined();
  });

  it('3. Tự động bật SSL/TLS (rejectUnauthorized: false) khi phát hiện host Neon (.neon.tech)', () => {
    const neonUrl = 'postgresql://alex:npg_secret@ep-cool-fog-123456.us-east-2.aws.neon.tech/neondb';
    const config = sanitizePostgresConfig(neonUrl);
    expect(config.ssl).toBeDefined();
    expect((config.ssl as any).rejectUnauthorized).toBe(false);
    expect(config.connectionString).toBe(neonUrl);
  });

  it('4. Tự động bật SSL/TLS khi phát hiện host Render PostgreSQL (.render.com)', () => {
    const renderPgUrl = 'postgres://acad_user:secret@dpg-crabcdef123-a.singapore-postgres.render.com/acad_prod';
    const config = sanitizePostgresConfig(renderPgUrl);
    expect(config.ssl).toBeDefined();
    expect((config.ssl as any).rejectUnauthorized).toBe(false);
  });

  it('5. Tự động bật SSL/TLS khi phát hiện host Supabase (.supabase.co)', () => {
    const supabaseUrl = 'postgresql://postgres.project:secret_pwd@aws-0-ap-southeast-1.pooler.supabase.co:6543/postgres';
    const config = sanitizePostgresConfig(supabaseUrl);
    expect(config.ssl).toBeDefined();
    expect((config.ssl as any).rejectUnauthorized).toBe(false);
  });

  it('6. Tự động bật SSL/TLS khi URL chứa sslmode=require', () => {
    const requireUrl = 'postgres://user:pass@db.example.org:5432/community?sslmode=require';
    const config = sanitizePostgresConfig(requireUrl);
    expect(config.ssl).toBeDefined();
    expect((config.ssl as any).rejectUnauthorized).toBe(false);
  });

  it('7. Tự động bật SSL/TLS khi phát hiện host Supabase IPv4 Pooler (aws-0-ap-southeast-1.pooler.supabase.com)', () => {
    const poolerUrl = 'postgresql://postgres.asdasdasdasdasdasd:secret_pwd@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require';
    const config = sanitizePostgresConfig(poolerUrl);
    expect(config.ssl).toBeDefined();
    expect((config.ssl as any).rejectUnauthorized).toBe(false);
  });

  it('8. PostgresUserRepository tự động kích hoạt InMemory fallback khi kết nối CSDL lỗi mà không crash', async () => {
    // Cung cấp một host giả lập không thể kết nối tới
    const unreachableRepo = new PostgresUserRepository('postgresql://unreachable_user:dummy@127.0.0.1:59999/dummy_db');

    // Thao tác tạo người dùng sẽ tự động chuyển sang fallback
    const user = await unreachableRepo.create({
      username: 'resilient_user',
      email: 'resilient@acad.dev',
      passwordHash: 'dummy_hash',
      role: 'USER',
      status: 'ACTIVE',
      karmaScore: 50,
    });

    expect(user).toBeDefined();
    expect(user.username).toBe('resilient_user');
    expect(user.id).toBeDefined();

    // Thao tác tra cứu theo email vẫn hoạt động mượt mà
    const found = await unreachableRepo.findByEmail('resilient@acad.dev');
    expect(found).not.toBeNull();
    expect(found?.username).toBe('resilient_user');

    await unreachableRepo.close();
  });
});
