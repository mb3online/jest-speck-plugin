'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.JestSpeckPlugin = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }(); /* speck
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'name': 'JestSpeckPlugin'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'type': 'Plugin'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'description': 'Generates a Jest test shell with the given interactions.'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'props': ''
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'sub-components': []
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'usage':
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        'jsx': '''
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          <JestSpeckPlugin ...props />
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        '''
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       'interactions': [
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'can parse interactions from a file.',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'can generate a test shell from a file.',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'can append to a file cleanly.',
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         'can create a new test file cleanly.'
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       ]
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     */


var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _fs = require('fs');

var fs = _interopRequireWildcard(_fs);

var _path = require('path');

var path = _interopRequireWildcard(_path);

var _mkdirp = require('mkdirp');

var _mkdirp2 = _interopRequireDefault(_mkdirp);

var _mb3Speck = require('mb3-speck');

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ZERO = 0;

var IT_SHELL = '\n\tit(\'<%= interaction %>\', () => {\n\t\t// Arrange\n\n\t\t// Act\n\n\t\t// Assert\n\n\t\tfail(\'Test not implemented.\');\n\t});';
var DESCRIBE_SHELL_START = '/* eslint-disable */\nimport React from \'react\';\n\nimport { shallow, mount, render } from \'enzyme\';\nimport injectTapEventPlugin from \'react-tap-event-plugin\';\n\nimport <%= className %> from \'<%= relativePath %>\';\n\ninjectTapEventPlugin();\n\ndescribe(\'<%= name %>\', () => {';
var DESCRIBE_SHELL_FINISH = '\n});\n';
var JEST_EXTENSION = '.spec.jsx';
var location = void 0;
var logger = void 0;

function createItShell(interaction) {
    return _lodash2.default.template(IT_SHELL)({ interaction: interaction }).replace(/\t/gmi, '    ');
}

function createDescribeShell(name, className, relativePath) {
    var rlp = relativePath.split('/')[ZERO] === '..' ? relativePath : './' + relativePath;

    return _lodash2.default.template(DESCRIBE_SHELL_START)({
        name: name,
        className: className,
        relativePath: rlp
    });
}

function normalizePath(output) {
    if (!location || location === 'base') return '' + output + JEST_EXTENSION;else return path.join(location, '' + path.basename(output) + JEST_EXTENSION);
}

function readTestFile(name) {
    return fs.readFileSync(normalizePath(name), 'utf8');
}

function removeShellFinish(code) {
    var LAST = 1;
    var SECOND_LAST = 2;
    var splitCode = code.split('\n');
    var end = splitCode.length - LAST;

    return splitCode.splice(ZERO, splitCode[end].charAt(ZERO) === '\n' ? end - SECOND_LAST : end - LAST).reduce(toSingleString);
}

function isImplemented(code, interaction) {
    return !code.includes(interaction);
}

function toSingleString(a, b) {
    return a + '\n' + b;
}

function appendToFile(output, name, its) {
    logger.log('Appending to test file ' + output + JEST_EXTENSION);
    logger.skip();
    var rawCode = readTestFile(output);
    var code = removeShellFinish(rawCode);
    its = its.filter(function (interaction) {
        return isImplemented(code, interaction);
    });

    // something is new
    if (its.length > ZERO) {
        code += its.map(createItShell).reduce(toSingleString);
        code += DESCRIBE_SHELL_FINISH;

        return writeToFile(output, code);
    }
}

function writeToFile(output, code) {
    logger.write('' + output + JEST_EXTENSION);

    if (location !== 'base') {
        try {
            fs.lstatSync(location);
        } catch (e) {
            _mkdirp2.default.sync(location);
        }
    }

    var fid = fs.writeFileSync(normalizePath(output), code);

    if (!fid) logger.pass();

    return code;
}

function createNewFile(source, output, name, interactions) {
    logger.log('Writting new test file ' + output + JEST_EXTENSION);
    logger.skip();
    var relativePath = path.join(path.relative(path.resolve(path.dirname(output)), path.dirname(source)), path.basename(source));
    var code = [createDescribeShell(name, name, relativePath)];
    interactions.map(function (interaction) {
        return code.push(createItShell(interaction));
    });
    code.push(DESCRIBE_SHELL_FINISH);

    return writeToFile(output, code.reduce(toSingleString));
}

function testFileExists(output) {
    try {
        return fs.lstatSync(path.resolve(location, '' + output + JEST_EXTENSION)).isFile();
    } catch (e) {
        return false;
    }
}

function parseInteraction(interaction) {
    if (typeof interaction !== 'string') {
        throw new TypeError('Expecting interaction to be a string.');
    }
    var inter = interaction.trim();

    return inter.replace(/can/i, 'should').trim();
}

function setupLogger(l) {
    logger = l || console;
    if (!logger.skip) logger.skip = function () {
        return console.log('Done.');
    };
    if (!logger.write) logger.write = function (message) {
        return console.log('Writing: ' + message + '.');
    };
    if (!logger.pass) logger.pass = function () {
        return console.log('Success! \uD83C\uDF89');
    };
}

var JestSpeckPlugin = exports.JestSpeckPlugin = function () {
    function JestSpeckPlugin() {
        var testFileLocation = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : 'base';

        _classCallCheck(this, JestSpeckPlugin);

        location = testFileLocation;
    }

    _createClass(JestSpeckPlugin, [{
        key: 'parse',
        value: function parse(interactions) {
            return interactions.map(parseInteraction);
        }
    }, {
        key: 'run',
        value: function run(l, file, json) {
            if (!(json.name || json.interactions)) return;
            setupLogger(l);
            logger.log('Generating test file for ' + json.name + '.');
            var interactions = this.parse(json.interactions || []);
            var output = path.join(path.dirname(file), path.basename(file, path.parse(file).ext));
            if (!testFileExists(output)) {
                return createNewFile(file, output, json.name, interactions);
            }

            return appendToFile(output, json.name, interactions);
        }
    }]);

    return JestSpeckPlugin;
}();