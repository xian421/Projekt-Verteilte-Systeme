// jest.frontend.config.js
module.exports = {
  testEnvironment: "jsdom",
  roots: ["<rootDir>/frontend"],
  testMatch: ["**/tests/**/*.test.js", "**/tests/**/*.spec.js"]
};
