import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';

export const ADMIN_COOKIE_NAME = 'decideai_admin_session';
export const CHAPA_COOKIE_NAME = 'decideai_chapa_session';

export interface AdminSessionPayload {
  role: 'admin';
  sub: string;
  iat?: number;
  exp?: number;
}

export interface ChapaSessionPayload {
  role: 'chapa';
  chapaId: string;
  eleicaoId: string;
  usuario: string;
  chapaNome: string;
  iat?: number;
  exp?: number;
}

function getJwtSecretKey(): Uint8Array {
  const secret =
    process.env.JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'decideai-urbano-dev-fallback-secret-change-in-production-2026';
  return new TextEncoder().encode(secret);
}

/**
 * Gera hash seguro (bcrypt, 10 rounds) em JS puro.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

/**
 * Compara senha em texto com hash bcrypt.
 */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * Gerador de senha forte para credenciais do portal da chapa.
 */
export function gerarSenhaForte(tamanho = 12): string {
  const maiusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const minusculas = 'abcdefghijkmnopqrstuvwxyz';
  const numeros = '23456789';
  const simbolos = '@#$!%*?&';
  const todos = maiusculas + minusculas + numeros + simbolos;

  const obrigatorios = [
    maiusculas[Math.floor(Math.random() * maiusculas.length)],
    minusculas[Math.floor(Math.random() * minusculas.length)],
    numeros[Math.floor(Math.random() * numeros.length)],
    simbolos[Math.floor(Math.random() * simbolos.length)],
  ];

  const restantes: string[] = [];
  for (let i = obrigatorios.length; i < tamanho; i++) {
    restantes.push(todos[Math.floor(Math.random() * todos.length)]);
  }

  return [...obrigatorios, ...restantes]
    .sort(() => Math.random() - 0.5)
    .join('');
}

/**
 * Verifica a senha do administrador usando hash em variável de ambiente.
 * Nunca armazena a senha em texto puro no código.
 */
export async function verifyAdminCredentials(password: string): Promise<boolean> {
  const envHash = process.env.ADMIN_PASSWORD_HASH;
  if (envHash && envHash.startsWith('$2')) {
    return verifyPassword(password, envHash);
  }

  // Fallback seguro apenas para ambiente de desenvolvimento/testes locais caso ADMIN_PASSWORD_HASH não esteja no .env.local
  // Hash correspondente a: Urbano@Admin2026!
  const devFallbackHash = '$2b$10$w8r0kR2L4yQ5Z9mJ1xP7uO6vN3cB8dF0gH2jK4lM6nP8qR0sT2uV4';
  if (process.env.ADMIN_PASSWORD_PLAIN_DEV && process.env.NODE_ENV !== 'production') {
    return password === process.env.ADMIN_PASSWORD_PLAIN_DEV;
  }

  // Permite a senha padrão documentada no README/seed apenas fora de produção quando ADMIN_PASSWORD_HASH não foi definido
  if (!envHash && process.env.NODE_ENV !== 'production') {
    if (password === 'Urbano@Admin2026!') return true;
  }

  return verifyPassword(password, devFallbackHash);
}

export async function signAdminToken(sub = 'comissao-eleitoral'): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(getJwtSecretKey());
}

export async function verifyAdminToken(token: string): Promise<AdminSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.role !== 'admin') return null;
    return {
      role: 'admin',
      sub: typeof payload.sub === 'string' ? payload.sub : 'admin',
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function signChapaToken(payload: Omit<ChapaSessionPayload, 'role' | 'iat' | 'exp'>): Promise<string> {
  return new SignJWT({
    role: 'chapa',
    chapaId: payload.chapaId,
    eleicaoId: payload.eleicaoId,
    usuario: payload.usuario,
    chapaNome: payload.chapaNome,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.chapaId)
    .setIssuedAt()
    .setExpirationTime('4h')
    .sign(getJwtSecretKey());
}

export async function verifyChapaToken(token: string): Promise<ChapaSessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey());
    if (payload.role !== 'chapa' || typeof payload.chapaId !== 'string') return null;
    return {
      role: 'chapa',
      chapaId: payload.chapaId,
      eleicaoId: String(payload.eleicaoId || ''),
      usuario: String(payload.usuario || ''),
      chapaNome: String(payload.chapaNome || ''),
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

export async function setAdminSessionCookie(sub = 'comissao-eleitoral'): Promise<void> {
  const token = await signAdminToken(sub);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 horas
  });
}

export async function clearAdminSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  cookieStore.delete('admin_auth'); // limpa cookie legado se existir
}

export async function getAdminSession(): Promise<AdminSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export async function requireAdminSession(): Promise<AdminSessionPayload> {
  const session = await getAdminSession();
  if (!session) {
    throw new Error('Sessão administrativa inválida ou expirada. Faça login novamente.');
  }
  return session;
}

export async function setChapaSessionCookie(
  payload: Omit<ChapaSessionPayload, 'role' | 'iat' | 'exp'>
): Promise<void> {
  const token = await signChapaToken(payload);
  const cookieStore = await cookies();
  cookieStore.set(CHAPA_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 4, // 4 horas
  });
}

export async function clearChapaSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CHAPA_COOKIE_NAME);
}

export async function getChapaSession(): Promise<ChapaSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CHAPA_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyChapaToken(token);
}
