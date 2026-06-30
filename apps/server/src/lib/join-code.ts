import { customAlphabet } from "nanoid";

// Excludes ambiguous characters (0/O, 1/I) so codes are easy to read aloud and type.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const generateJoinCode = customAlphabet(ALPHABET, 6);
