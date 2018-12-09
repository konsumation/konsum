import test from 'ava';
import { prepareDatabase } from '../src/database';


const tmp = require('tmp'),
  tmpObj = tmp.tmpNameSync();

const config = {
  database: {
    file: tmpObj
  }
};

test('insert after create', async t => {
  const db = prepareDatabase(config);
  db.put('foo', 'bar');
  const value = await db.get('foo');
  t.is(value, 'bar')
  db.close();
});

