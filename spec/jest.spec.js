import * as path from 'path';
import * as fs from 'fs';
import rimraf from 'rimraf';

import {BabelSpeck} from 'mb3-speck';
import {JestSpeckPlugin} from '../src/index';

describe('Jest Speck Plugin', () => {
    let parser;

    beforeEach(() => {
        parser = new BabelSpeck('src', 'docs', { search: ['**/*.js'] }, [
            new JestSpeckPlugin(),
        ]);
    });

    afterAll(() => {
        const root = path.join(__dirname, '..');
        try {
            fs.unlinkSync(path.join(__dirname, 'index.spec.jsx'));
            fs.unlinkSync(path.join(root, 'src', 'index.spec.jsx'));
            rimraf(path.join(root, 'scripts'), err => { /* console.error(err)*/ });
        } catch (e) { /* console.error(e);*/ }
    });

    it('should be able to parse interactions from a file.', done => {
        parser.gather(files => {
            const file = files
                .filter(f => path.basename(f, '.js') === 'index')[0];

            const json = JSON.parse(parser.parseSingleFile(file));

            const jestPlugin = new JestSpeckPlugin();

            expect(jestPlugin.parse(json.interactions).length).toBe(4);
            done();
        });
    });

    it('should be able to generate a test shell from a file.', done => {
        parser.gather(files => {
            const file = files
                .filter(f => path.basename(f, '.js') === 'index')[0];

            const json = JSON.parse(parser.parseSingleFile(file));

            const jestPlugin = new JestSpeckPlugin('spec');

            jestPlugin.run(null, path.resolve('src', file), json);

            expect(fs.lstatSync(path.resolve('spec', 'index.spec.jsx')).isFile()).toBeTruthy();
            done();
        });
    });

    it('should put output files in the directories in which they were found.',
    done => {
        parser.gather().parse()
            .then(output => {
                const jestPlugin = new JestSpeckPlugin();
                output.map(data => {
                    if (data.json && JSON.parse(data.json).interactions)
                        jestPlugin.run(null, data.file, JSON.parse(data.json));
                });
                expect(fs.lstatSync(path.resolve('src/index.spec.jsx')).isFile()).toBeTruthy();
                done();
            });
    }
  );

    it('should be able to append to a file cleanly.', done => {
        const jestPlugin = new JestSpeckPlugin('spec');

        parser.gather(files => {
            const file = files
                .filter(f => path.basename(f, '.js') === 'index')[0];

            const json = parser.parseSingleFile(file);

            jestPlugin.run(null, path.resolve('src/plugins', file), json);

            expect(fs.lstatSync(path.resolve('spec', 'index.spec.jsx')).isFile()).toBeTruthy();

            jestPlugin.run(null,
                path.resolve('src/plugins', file),
                {
                    'name': 'JestSpeckPlugin',
                    'interactions': [
                        'this is a new interaction',
                    ],
                });

            expect(fs.readFileSync(path.resolve('spec', 'index.spec.jsx'), 'utf8').includes('this is a new interaction')).toBeTruthy();

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

    it('should still proceed with an undefined or null location', done => {
        parser.gather(files => {
            const file = files
                .filter(f => path.basename(f, '.js') === 'index')[0];

            const json = JSON.parse(parser.parseSingleFile(file));

            const jestPlugin = new JestSpeckPlugin(undefined);

            jestPlugin.run(null, path.resolve('src', file), json);

            expect(fs.lstatSync(path.resolve('src', 'index.spec.jsx')).isFile()).toBeTruthy();
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

        jestPlugin.run(null, testFilePath, json);

        expect(fs.readFileSync(testSpecFilePath, 'utf8')
            .includes('should')).toBeTruthy();

        fs.unlinkSync(testFilePath);
        fs.unlinkSync(testSpecFilePath);
    });

    it('should create directory structure if it doesn\'t exist.', () => {
        const filePath = 'scripts/is/a/made/up/path';
        const jestPlugin = new JestSpeckPlugin(filePath);

        jestPlugin.run(null, path.resolve('script'), {
            'name': 'test',
            'interactions': [
                'can yolo',
            ],
        });

        expect(fs.lstatSync(path.resolve('scripts/is/a/made/up/path/script.spec.jsx')).isFile())
            .toBeTruthy();

        rimraf(path.resolve('scripts/is'), err => console.log(err));
    });
});
