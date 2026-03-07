import assert from 'node:assert/strict';

process.env.RUN_MODE = 'selftest';
process.env.TELEGRAM_BOT_TOKEN = 'test_token';

const { processTextCommand, selftestRuntime } = await import('./index.js');

if (!selftestRuntime) {
    throw new Error('selftestRuntime is unavailable. RUN_MODE=selftest is required.');
}

const chatId = 'dialog-user';

const lastMessageText = () => {
    const messages = selftestRuntime.getMessages();
    return messages[messages.length - 1]?.text || '';
};

const runCase = async (name, execute) => {
    selftestRuntime.reset();

    try {
        await execute();
        console.log(`PASS ${name}`);
    } catch (error) {
        console.log(`FAIL ${name}`);
        console.log(`  Error: ${error.message}`);
        throw error;
    }
};

await runCase('ambiguous add asks for type with summary', async () => {
    await processTextCommand(chatId, 'Starbucks 6000 won tomorrow');
    assert.match(lastMessageText(), /Напишите: `расход`, `доход` или `подписка`/i);
    assert.match(lastMessageText(), /starbucks/i);
    assert.match(lastMessageText(), /6,?000/i);
});

await runCase('pending clarification can be interrupted by new intent', async () => {
    await processTextCommand(chatId, 'Starbucks 6000 won tomorrow');
    await processTextCommand(chatId, 'мои расходы');
    assert.match(lastMessageText(), /пока нет расходов/i);
});

await runCase('ask_name flow can be interrupted by list request', async () => {
    await processTextCommand(chatId, 'добавь');
    assert.match(lastMessageText(), /Какой сервис добавить/i);

    await processTextCommand(chatId, 'мои подписки');
    assert.match(lastMessageText(), /пока нет подписок/i);
});

await runCase('clarification answer saves an expense', async () => {
    await processTextCommand(chatId, 'Starbucks 6000 won tomorrow');
    await processTextCommand(chatId, 'расход');

    assert.match(lastMessageText(), /Записал расход/i);

    const dbDump = selftestRuntime.getData();
    const expenses = dbDump[`users/${chatId}/expenses`] || [];
    assert.equal(expenses.length, 1, 'expense should be stored in selftest db');
});

console.log('\nAll dialog regressions passed.');
