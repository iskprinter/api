import Token from './Token'

test('stub test', () => {
  const token = new Token({
    accessToken: 'some-access-token',
    refreshToken: 'some-refresh-token',
  })
  expect(token).toBeTruthy()
});
