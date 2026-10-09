import os
from privatecord_bot import PrivateCordBot

bot=PrivateCordBot(
    token=os.getenv('PRIVATECORD_BOT_TOKEN','WKLEJ_TOKEN_DO_ZMIENNEJ'),
    bot_id='WKLEJ_ID_BOTA',
    prefix='!',
    service_account=os.getenv('GOOGLE_APPLICATION_CREDENTIALS','serviceAccount.json')
)
bot.run()
