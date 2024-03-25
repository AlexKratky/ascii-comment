import * as vscode from 'vscode';

function convertToAscii(text: string): string {
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function singleComment(line: number, text: string) {
	const pStart = new vscode.Position(line, text.indexOf('//'));
	const pEnd = new vscode.Position(line, text.length);

	const textInRange = text.substring(text.indexOf('//'), text.length);
	const range = new vscode.Range(pStart, pEnd);

	return {range, text: textInRange};
}

export function activate(context: vscode.ExtensionContext) {
	let disposable = vscode.commands.registerCommand('ascii-comment.convertSelection', () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
			const selection = editor.selection;
            const text = editor.document.getText(selection);
            const convertedText = convertToAscii(text);
            editor.edit(editBuilder => {
                editBuilder.replace(selection, convertedText);
            });
        }
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('ascii-comment.convertComments', () => {
		const editor = vscode.window.activeTextEditor;
        if (editor) {
            const document = editor.document;
			let isInComment = false;
			let commentStart = null as vscode.Position|null;
			const replaceRange = [] as Array<{range: vscode.Range, text: string}>;
			for (let i = 0; i < document.lineCount; i++) {
				const line = document.lineAt(i);
				const text = line.text.trim();

				if (text.includes('//') && ! isInComment) {
					replaceRange.push(singleComment(i, text));
				}

				let foundCommentInLoop = true;
				let previousCommentPos = null;
				while (foundCommentInLoop) {
					foundCommentInLoop = false;
					if ( ! isInComment && text.includes('/*', previousCommentPos ?? 0)) {
						isInComment = true;
						commentStart = new vscode.Position(i, text.indexOf('/*', previousCommentPos ?? 0));
						foundCommentInLoop = true;
						previousCommentPos = text.indexOf('/*', previousCommentPos ?? 0);
					}

					if (isInComment && commentStart && text.includes('*/', previousCommentPos ?? 0)) {
						isInComment = false;
						const pEnd = new vscode.Position(i, text.indexOf('*/', previousCommentPos ?? 0));
	
						const range = new vscode.Range(commentStart, pEnd);
						const textInRange = editor.document.getText(range);
	
						replaceRange.push({range, text: textInRange});
						foundCommentInLoop = true;
						previousCommentPos = text.indexOf('*/', previousCommentPos ?? 0);
					}
				}
				
			}

			editor.edit(editBuilder => {
				for (const replace of replaceRange) {
					editBuilder.replace(replace.range, convertToAscii(replace.text));
				}
			});
		}
    });

    context.subscriptions.push(disposable);

    disposable = vscode.commands.registerCommand('ascii-comment.convertAll', () => {
		const editor = vscode.window.activeTextEditor;
        if (editor) {
			editor.edit(editBuilder => {
				const documentEnd = new vscode.Position(editor.document.lineCount + 1, 0);
				const wholeDocument = new vscode.Range(new vscode.Position(0, 0), documentEnd);
				editBuilder.replace(wholeDocument, convertToAscii(editor.document.getText()));
			});
        }
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {}
