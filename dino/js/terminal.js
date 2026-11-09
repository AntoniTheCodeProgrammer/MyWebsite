'use strict';

(function () {
    var terminal = document.querySelector('.command-terminal');
    var history = document.getElementById('command-history');
    var prompt = '~/antonizmujdzin.pl/dino %';
    var activeLine = document.querySelector('.command-line');
    var activeInput = document.getElementById('command-input');

    function runCommand(command) {
        var trimmedCommand = command.trim();
        var separator = trimmedCommand.search(/\s/);
        var name = separator === -1 ? trimmedCommand : trimmedCommand.slice(0, separator);
        var argument = separator === -1 ? '' : trimmedCommand.slice(separator).trim();

        switch (name.toLowerCase()) {
            case '':
                return '';
            case 'shop':
                return 'Shop is currently unavailable.';
            case 'buy':
                return 'Buying items is currently unavailable.';
            case 'inventory':
                return 'Inventory is currently unavailable.';
            case 'select':
                return 'Selecting items is currently unavailable.';
            case 'help':
                return 'shop - Print available items in the shop\nbuy <item name or id> - Purchase items\ninventory - View your inventory\nselect <item name or id> - Select an item\nclear - Clear the terminal';
            case '67':
                return '   ____ ______ \n  / ___|____  |\n | |___    / / \n |  _  |  / /  \n | |_| | / /   \n \\____/ /_/    \n \n     _^^^_   \n    ( o o )\n     ( ^ )\n     __|_\n    /  | \\ \n  \\_/  |  \\ \n       |  \\_/';
            case 'echo':
                return argument;
            case 'date':
                return new Date().toLocaleString('pl-PL');
            case 'clear':
                return '';
            default:
                return 'dino: command not found: ' + name + '\nType "help" for a list of available commands.';
        }
    }

    function appendOutput(text) {
        if (!text) {
            return;
        }

        var output = document.createElement('pre');
        output.className = 'command-output';
        output.textContent = text;
        history.appendChild(output);
    }

    function createInputLine() {
        var line = document.createElement('label');
        var promptElement = document.createElement('span');
        var input = document.createElement('input');

        line.className = 'command-line';
        promptElement.className = 'command-prompt';
        promptElement.setAttribute('aria-hidden', 'true');
        promptElement.textContent = prompt;
        input.type = 'text';
        input.setAttribute('aria-label', 'Polecenie terminala');
        input.autocomplete = 'off';
        input.spellcheck = false;
        input.addEventListener('keydown', handleKeyDown);
        input.addEventListener('keyup', stopGameKeyHandling);
        line.append(promptElement, input);

        return { line: line, input: input };
    }

    function stopGameKeyHandling(event) {
        event.stopPropagation();
    }

    function handleKeyDown(event) {
        event.stopPropagation();

        if (event.key !== 'Enter') {
            return;
        }

        event.preventDefault();

        var command = activeInput.value;
        if (command.trim().toLowerCase() === 'clear') {
            history.replaceChildren();
        }

        var entry = document.createElement('div');
        var promptElement = document.createElement('span');
        var commandElement = document.createElement('span');

        entry.className = 'command-entry';
        promptElement.className = 'command-prompt';
        promptElement.textContent = prompt;
        commandElement.textContent = command;
        entry.append(promptElement, commandElement);
        history.appendChild(entry);

        appendOutput(runCommand(command));
        activeLine.remove();

        var nextLine = createInputLine();
        activeLine = nextLine.line;
        activeInput = nextLine.input;
        terminal.appendChild(activeLine);
        terminal.scrollTop = terminal.scrollHeight;
        activeInput.focus();
    }

    activeInput.addEventListener('keydown', handleKeyDown);
    activeInput.addEventListener('keyup', stopGameKeyHandling);
})();
