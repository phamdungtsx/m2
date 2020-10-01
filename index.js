#!/usr/bin/env node

const chalk = require('chalk')
const clear = require('clear')
const figlet = require('figlet')
const fs = require('fs')
const inquirer = require('inquirer')
const _ = require('lodash')
const fuzzy = require('fuzzy')
const path = require('path')
const { exec } = require("child_process")

const bin = 'Source/server/bin/magento'

if (!fs.existsSync(bin)) {
    console.log('Project Magento was not found.')
    process.exit()
}

fs.chmodSync(bin, 0755)

clear()

console.log(
    chalk.yellow(
        figlet.textSync(path.basename(process.cwd()), { horizontalLayout: 'full' })
    )
);

try {
    const composer = JSON.parse(fs.readFileSync('Source/server/composer.json', { encoding: 'utf8', flag: 'r' }))
    composer.name === 'magento/project-community-edition' && console.log(chalk.green('Magento CE ' + composer.version));
    composer.name === 'magento/project-enterprise-edition' && console.log(chalk.green('Magento EE ' + composer.version));
}
catch (e) {
    console.log(e);
}

try {
    const posConfigData = fs.readFileSync('Source/server/app/code/Magestore/Webpos/etc/config.xml', { encoding: 'utf8', flag: 'r' });
    const line = posConfigData.match(/<line>(.+?)<\/line>/)
    const version = posConfigData.match(/<version>(.+?)<\/version>/)
    console.log(chalk.green(line[1] + ' ' + version[1] + "\n"));
}
catch (e) {}


const listCommand = fs.readFileSync(__dirname + '/magento_commands', { encoding: 'utf8', flag: 'r' }).
    match(/\n\s\s([a-z0-9:-]+)/g).
    map(i => i.trim())

const searchCommand = (answers, input) => {
    input = input || '';
    return new Promise(function (resolve) {
        setTimeout(function () {
            var commandResult = fuzzy.filter(input, listCommand);
            resolve(
                commandResult.map(function (el) {
                    return el.original;
                })
            );
        }, _.random(30, 500));
    });
}

const run = (cmd) => {
    const execProcess = exec(cmd);
    console.log(chalk.green(cmd));

    execProcess.stdout.on('data', function (data) {
        console.log(data);
    });
    execProcess.stderr.on('data', function (data) {
        console.log(data);
    });
}

inquirer.registerPrompt('autocomplete', require('inquirer-autocomplete-prompt'));

inquirer.prompt([
    {
        type: 'autocomplete',
        name: 'command',
        message: 'What do you want to do?',
        source: searchCommand,
    }
]).then(answers => {
    const cmd = answers.command;
    const command = 'php -d memory_limit=-1 ' + bin + ' ' + cmd;

    if(cmd === "setup:di:compile") {
        const rmCmd = "rm -rf Source/server/generated/code"
        exec(rmCmd, () => {
            console.log(chalk.green(rmCmd));
            run(command)
        });
    }
    else {
        run(command)
    }

});