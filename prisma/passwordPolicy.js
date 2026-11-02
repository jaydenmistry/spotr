// Admin password policy, shared by prisma/seed.js (plain Node at container
// start, so this stays CommonJS with no dependencies).

const MIN_LENGTH = 12;
const MIN_UNIQUE_CHARACTERS = 5;

// Compared after lowercasing, dropping punctuation and trailing digits, so
// "Password123!" and "spotrcars2024" both count as common.
const COMMON_BASES = new Set([
  "password", "passw0rd", "pssword", "admin", "administrator", "root", "user", "login",
  "welcome", "letmein", "changeme", "default", "secret", "test", "testing", "demo",
  "qwerty", "qwertyuiop", "asdfgh", "asdfghjkl", "zxcvbnm", "abc", "abcdef", "iloveyou",
  "monkey", "dragon", "master", "sunshine", "princess", "football", "baseball", "superman",
  "trustno", "starwars", "whatever", "spotr", "spotrcars", "spotrcarscom", "spotradmin",
  // Placeholder from the README's setup steps.
  "choosealonguniquepassword",
]);

// After removing these, a password needs at least this much left over, so
// "passwordpassword" or "admin-qwerty-2024" don't pass on length alone.
const COMMON_WORDS = Array.from(COMMON_BASES).filter((word) => word.length >= 5);
const MIN_REMAINDER = 4;

function normalize(password) {
  return password.toLowerCase().replace(/[^a-z0-9]/g, "").replace(/[0-9]+$/, "");
}

/** Returns why `password` is too weak for the admin account, or null if it's acceptable. */
function adminPasswordProblem(password, email) {
  if (typeof password !== "string" || password.length < MIN_LENGTH) {
    return `must be at least ${MIN_LENGTH} characters`;
  }
  if (new Set(password).size < MIN_UNIQUE_CHARACTERS) {
    return "is too repetitive";
  }
  const base = normalize(password);
  if (base === "" || COMMON_BASES.has(base)) {
    return "is a common password";
  }
  const remainder = COMMON_WORDS.reduce((rest, word) => rest.split(word).join(""), base);
  if (remainder.length < MIN_REMAINDER) {
    return "is mostly common words";
  }
  const lowered = password.toLowerCase();
  const localPart = (email || "").toLowerCase().split("@")[0];
  if (localPart.length >= 4 && lowered.includes(localPart)) {
    return "must not contain the admin email's username";
  }
  return null;
}

module.exports = { adminPasswordProblem, MIN_LENGTH };
