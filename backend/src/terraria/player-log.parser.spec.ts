import {
  OnlinePlayerTracker,
  parseAggregatePlayerCount,
  parsePlayerLogLine,
} from './player-log.parser';

describe('player-log.parser', () => {
  describe('parsePlayerLogLine', () => {
    it('parses join messages', () => {
      expect(parsePlayerLogLine('华哥 has joined.')).toEqual({
        event: 'join',
        playerName: '华哥',
      });
      expect(parsePlayerLogLine('Steve has joined')).toEqual({
        event: 'join',
        playerName: 'Steve',
      });
    });

    it('parses leave messages', () => {
      expect(parsePlayerLogLine('华哥 has left.')).toEqual({
        event: 'leave',
        playerName: '华哥',
      });
      expect(parsePlayerLogLine('Steve has left')).toEqual({
        event: 'leave',
        playerName: 'Steve',
      });
    });

    it('ignores unrelated log lines', () => {
      expect(parsePlayerLogLine('Server started')).toBeNull();
    });
  });

  describe('OnlinePlayerTracker', () => {
    it('tracks joins and leaves', () => {
      const tracker = new OnlinePlayerTracker();

      expect(tracker.apply('join', '华哥')).toBe(1);
      expect(tracker.apply('join', 'Steve')).toBe(2);
      expect(tracker.apply('leave', '华哥')).toBe(1);
      expect(tracker.count).toBe(1);
    });

    it('resets on restart', () => {
      const tracker = new OnlinePlayerTracker();
      tracker.apply('join', '华哥');
      tracker.reset();
      expect(tracker.count).toBe(0);
    });
  });

  describe('parseAggregatePlayerCount', () => {
    it('parses fallback aggregate formats', () => {
      expect(parseAggregatePlayerCount('3/8 players')).toBe(3);
      expect(parseAggregatePlayerCount('2 users are playing')).toBe(2);
    });
  });
});
