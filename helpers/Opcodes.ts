import { crc32 } from './crc32';

export const Opcodes = {
    deposit: crc32('deposit'),
    supply: crc32('supply')
};