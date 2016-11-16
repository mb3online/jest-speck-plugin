import * as path from 'path';
import * as fs from 'fs';
import rimraf from 'rimraf';

import {BabelSpeck} from '../../src/babel.speck';
import {JestSpeckPlugin} from '../../src/plugins/jest.plugin';
import Logger from '../../src/logger';
import Comment from '../../src/comment';

describe('Jest Speck Plugin', () => {
  let parser;

  beforeEach(() => {
    parser = new BabelSpeck('src', 'docs', { search: ['**/*.js'] }, [
      new JestSpeckPlugin()
    ]);
  });

  afterAll(() => {
    try {
      fs.unlinkSync(path.resolve('spec/jest.plugin.spec.jsx'));
      fs.unlinkSync(path.resolve('src/plugins/jest.plugin.spec.jsx'));
      fs.unlinkSync(path.resolve('src/plugins/storybook.plugin.spec.jsx'));
      rimraf(path.resolve('.storybook'), err => {/*console.error(err)*/});
      rimraf(path.resolve('testing'), err => {/*console.error(err)*/});
    } catch (e) {
      /*console.error(e);*/
    }
  });

  it('should be able to parse interactions from a file.', (done) => {
    parser.gather(files => {
      const file = files
        .filter(f => path.basename(f, '.js') === 'jest.plugin')[0];

      const json = JSON.parse(parser.parseSingleFile(file));

      const jestPlugin = new JestSpeckPlugin();

      expect(jestPlugin.parse(json.interactions).length).toBe(4);
      done();
    });
  });

  it('should be able to generate a test shell from a file.', (done) => {
    parser.gather(files => {
      const file = files
        .filter(f => path.basename(f, '.js') === 'jest.plugin')[0];

      const json = JSON.parse(parser.parseSingleFile(file));

      const jestPlugin = new JestSpeckPlugin('spec');

      jestPlugin.run(new Logger(), path.resolve('src/plugins', file), json);

      expect(fs.lstatSync(path.resolve('spec', 'jest.plugin.spec.jsx')).isFile()).toBeTruthy();
      done();
    });
  });

  it('should put output files in the directories in which they were found.',
    (done) => {
      parser.gather().parse()
        .then(output => {
          const jestPlugin = new JestSpeckPlugin();
          const logger = new Logger();
          Logger.start();
          output.map(data => {
            if(data.json && JSON.parse(data.json).interactions)
              jestPlugin.run(logger, data.file, JSON.parse(data.json));
          });
          Logger.stop();
          expect(fs.lstatSync(path.resolve('src/plugins/storybook.plugin.spec.jsx')).isFile()).toBeTruthy();
          expect(fs.lstatSync(path.resolve('src/plugins/jest.plugin.spec.jsx')).isFile()).toBeTruthy();
          done();
        });
    }
  );

  it('should be able to append to a file cleanly.', (done) => {
    const text = `
      'name': 'JestSpeckPlugin'
      'interactions': [ 'this is a new interaction' ]
    `;
    const comment = new Comment(text);
    const jestPlugin = new JestSpeckPlugin('spec');
    const logger = new Logger();
    Logger.start();

    parser.gather(files => {
      const file = files
        .filter(f => path.basename(f, '.js') === 'jest.plugin')[0];

      const json = parser.parseSingleFile(file);

      jestPlugin.run(logger, path.resolve('src/plugins', file), json);

      expect(fs.lstatSync(path.resolve('spec', 'jest.plugin.spec.jsx')).isFile()).toBeTruthy();

      jestPlugin.run(logger,
        path.resolve('src/plugins', file),
        comment.parse().toJSON());

      expect(fs.readFileSync(path.resolve('spec', 'jest.plugin.spec.jsx'), 'utf8').includes('this is a new interaction')).toBeTruthy();

      Logger.stop();

      done();
    });
  });

  it('should throw an exception if interactions isn\'t present', () => {
    try {
      (new JestSpeckPlugin()).parse([{ a: 'b'}]);
    } catch (e) {
      expect(e).toEqual(new TypeError('Expecting interaction to be a string.'));
    }
  });

  it('should still proceed with an undefined or null location', (done) => {
    parser.gather(files => {
      const file = files
        .filter(f => path.basename(f, '.js') === 'jest.plugin')[0];

      const json = JSON.parse(parser.parseSingleFile(file));

      const jestPlugin = new JestSpeckPlugin(undefined);

      jestPlugin.run(new Logger(), path.resolve('src/plugins', file), json);

      expect(fs.lstatSync(path.resolve('src/plugins', 'jest.plugin.spec.jsx')).isFile()).toBeTruthy();
      done();
    });
  });

  it('shouldn\'t care about case in interactions', () => {
    const jestPlugin = new JestSpeckPlugin(undefined);
    const json = {
        name: 'test',
        interactions: [
          'Can do something',
        ],
      };

    const testFilePath = path.join(__dirname, 'test.jsx');
    const testSpecFilePath =
      path.join(path.dirname(testFilePath), 'test.spec.jsx');

    fs.writeFileSync(testFilePath, JSON.stringify(json));

    expect(fs.lstatSync(testFilePath).isFile()).toBeTruthy();

    jestPlugin.run(new Logger(), testFilePath, json);

    expect(fs.readFileSync(testSpecFilePath, 'utf8')
      .includes('should')).toBeTruthy();

    fs.unlinkSync(testFilePath);
    fs.unlinkSync(testSpecFilePath);
  });

  it('should create directory structure if it doesn\'t exist.', () => {
    const filePath = 'scripts/is/a/made/up/path';
    const jestPlugin = new JestSpeckPlugin(filePath);

    const testString = `
      'name': 'test'
      'interactions': [
        'can yolo'
      ]
    `;

    const comment = new Comment(testString);
    const logger = new Logger();
    Logger.start();

    jestPlugin.run(logger, path.resolve('script'), comment.parse().toJSON());

    expect(fs.lstatSync(path.resolve('scripts/is/a/made/up/path/script.spec.jsx')).isFile())
      .toBeTruthy();

    Logger.stop();

    rimraf(path.resolve('scripts/is'), err => console.log(err));
  });
});
