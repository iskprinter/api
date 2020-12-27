import { timeStamp } from 'console';
import { isMainThread } from 'worker_threads';
import { Token } from './Token';

test('stub test', () => {
    const token = new Token('accessToken', 'refreshToken');
    expect(true).toBe(true);
});
