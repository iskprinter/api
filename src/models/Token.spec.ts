import Token from './Token'

test('stub test', () => {
  const token = new Token('accessToken', 'refreshToken')
  expect(token).toBeTruthy()
});
