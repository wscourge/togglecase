import {
	window,
	workspace,
	Position,
	Selection,
	commands,
	ExtensionContext,
	TextEditor,
	TextLine
} from 'vscode';

import camelCase from 'lodash.camelcase';
import snakeCase from 'lodash.snakecase';
import kebabCase from 'lodash.kebabcase';

export function activate(context: ExtensionContext) {
	context.subscriptions.push(commands.registerCommand('editor.togglecase', toggle));
}

export function deactivate() {
	window.showInformationMessage('ToggleCase deactivated.');
}

function toggle() {
	const editor: TextEditor = window.activeTextEditor!;
	const document = editor.document;
	const pattern: RegExp = getPattern(editor);
	const changes: { selection: Selection, replacement: string }[] = [];

	editor.selections.forEach(selection => {
		let current: Selection = selection;
		let selectedText: string = document.getText(selection) || '';

		if (!selectedText) {
			// there is no text selected, only the caret
			const lineAt: TextLine = document.lineAt(selection.start.line);
			const text: string = lineAt.text;
			let leftPosition: number = selection.start.character;
			// collect characters on the left side of the caret
			while (leftPosition >= 0 && pattern.test(text[leftPosition])) {
				selectedText = `${text[leftPosition] || ''}${selectedText}`;
				leftPosition -= 1;
			}
			// collect characters on the right side of the caret
			// starting position (selection.start.character) is included in the
			// previous iteration, hence right position is incremented here
			let rightPosition: number = selection.start.character + 1;
			while (rightPosition < text.length && pattern.test(text[rightPosition])) {
				selectedText += text[rightPosition];
				rightPosition += 1;
			}

			const start: Position = new Position(selection.start.line, leftPosition + 1);
			const end: Position = new Position(selection.start.line, rightPosition);
			current = new Selection(start, end);
		}

		changes.push({
			selection: current,
			replacement: nextCase(selectedText.trim().replace(/^[0-9]/, ''))
		});
	});

	editor.edit(builder => {
		changes.forEach(({ selection, replacement }) => {
			builder.replace(selection, replacement);
		});
	});
};

function isCamelCase(string: string) { return camelCase(string) === string; }
function isSnakeCase(string: string) { return snakeCase(string) === string; }

// 1. nocase -> camelCase
// 2. camelCase -> snake_case
// 3. snake_case -> kebab-case
// 4. kebab-case -> camelCase
function nextCase(value: string) {
	if (isCamelCase(value)) {return snakeCase(value);}
	if (isSnakeCase(value)) {return kebabCase(value);}
	// nocase or kebab-case
	return camelCase(value);
}

function getPattern(editor: TextEditor) {
	const language: any = workspace.getConfiguration().get(`[${editor.document.languageId}]`) || {};

	return new RegExp(language['togglecase.pattern'] || workspace.getConfiguration('togglecase').get('pattern'));
}
