import bcrypt from 'bcrypt';
import { env } from '../config/env.config.js';

export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, env.bcrypt.saltRounds);
}

export async function comparePassword(plainPassword, passwordHash) {
  return bcrypt.compare(plainPassword, passwordHash);
}
