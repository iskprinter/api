import Token from './Token'

test('stub test', () => {
  const token = new Token({
    eveAccessToken: 'some-eve-access-token',
    eveRefreshToken: 'some-eve-refresh-token',
    iskprinterAccessToken: 'some-iskprinter-access-token',
    iskprinterRefreshToken: 'some-iskprinter-refresh-token',
  })
  expect(token).toBeTruthy()
});
