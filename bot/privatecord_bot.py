import os
import time
from typing import Optional
import firebase_admin
from firebase_admin import credentials, firestore


class PrivateCordBot:
    """Prosty klient bota tekstowego PrivateCord.

    Klient bota do kanałów tekstowych.
    Obserwuje ostatnie wiadomości, odpowiada na komendy i aktualizuje obecność.
    """
    def __init__(self, config_path='config.json', *, token: Optional[str]=None,
                 bot_id: Optional[str]=None, prefix: str='!', service_account: Optional[str]=None,
                 poll_seconds: float=2.0):
        cfg={}
        if os.path.exists(config_path):
            import json
            with open(config_path,'r',encoding='utf-8') as f: cfg=json.load(f)
        self.token = token or os.getenv('PRIVATECORD_BOT_TOKEN') or cfg.get('token','')
        self.bot_id = bot_id or cfg.get('bot_document_id','')
        self.prefix = prefix if prefix != '!' or 'prefix' not in cfg else cfg.get('prefix','!')
        self.poll_seconds=float(cfg.get('poll_seconds',poll_seconds))
        service_account = service_account or os.getenv('GOOGLE_APPLICATION_CREDENTIALS') or cfg.get('firebase_service_account','serviceAccount.json')
        if not self.bot_id: raise ValueError('Brak bot_document_id / bot_id.')
        if not self.token: raise ValueError('Brak tokenu bota.')
        if not firebase_admin._apps:
            firebase_admin.initialize_app(credentials.Certificate(service_account))
        self.db=firestore.client()
        self.seen=set()
        self.installed_servers=set()
        self.last_install_refresh=0
        self.last_presence=0

    def bot_doc(self):
        snap=self.db.collection('bots').document(self.bot_id).get()
        if not snap.exists: raise RuntimeError('Nie znaleziono dokumentu bota.')
        data=snap.to_dict()
        if data.get('token') != self.token: raise RuntimeError('Token bota jest nieprawidłowy.')
        return data

    def refresh_installations(self):
        now=time.time()
        if now-self.last_install_refresh < 10: return
        self.installed_servers=set()
        for snap in self.db.collection('botInstallations').where('botId','==',self.bot_id).where('enabled','==',True).stream():
            d=snap.to_dict(); sid=d.get('serverId')
            if sid:self.installed_servers.add(sid)
        self.last_install_refresh=now

    def presence(self, active=True, activity=''):
        if time.time()-self.last_presence < 10:return
        ref=self.db.collection('botProfiles').document(self.bot_id)
        try:
            ref.update({'status':'online' if active else 'offline','sessionActive':active,
                        'lastSeen':firestore.SERVER_TIMESTAMP,
                        'activity':activity or f'Bot PrivateCord · {self.prefix}help'})
            self.last_presence=time.time()
        except Exception as e: print('Presence:',e)

    def send_message(self, server_id, channel_id, content):
        self.db.collection('messages').add({
            'serverId':server_id,'channelId':channel_id,'uid':self.bot_id,
            'content':content,'attachments':[],'reactions':{},'pinned':False,
            'createdAt':firestore.SERVER_TIMESTAMP
        })

    def on_message(self,msg):
        sid=msg.get('serverId'); cid=msg.get('channelId')
        if not sid or sid not in self.installed_servers: return
        if msg.get('uid')==self.bot_id: return
        text=(msg.get('content') or '').strip()
        if not text.startswith(self.prefix): return
        args=text[len(self.prefix):].split()
        if not args:return
        cmd,args=args[0].lower(),args[1:]
        if cmd=='ping': self.send_message(sid,cid,'Pong! PrivateCord bot działa.')
        elif cmd=='help': self.send_message(sid,cid,f'Komendy: {self.prefix}ping, {self.prefix}help, {self.prefix}say <tekst>, {self.prefix}info')
        elif cmd=='say': self.send_message(sid,cid,' '.join(args) or 'Podaj tekst.')
        elif cmd=='info': self.send_message(sid,cid,'Bot Python • PrivateCord • kanały tekstowe')
        else: self.send_message(sid,cid,f'Nie znam komendy `{cmd}`. Użyj {self.prefix}help.')

    def run(self):
        print('PrivateCord bot uruchomiony.')
        bot=self.bot_doc(); self.prefix=bot.get('commandPrefix',self.prefix)
        try:
            while True:
                bot=self.bot_doc()
                if bot.get('enabled') is False:
                    self.presence(False,'Bot wyłączony'); time.sleep(2); continue
                self.refresh_installations(); self.presence(True)
                q=self.db.collection('messages').order_by('createdAt',direction=firestore.Query.DESCENDING).limit(100)
                for snap in q.stream():
                    if snap.id in self.seen: continue
                    self.seen.add(snap.id); self.on_message(snap.to_dict())
                if len(self.seen)>5000:self.seen=set(list(self.seen)[-2000:])
                time.sleep(self.poll_seconds)
        finally:
            self.presence(False,'Bot offline')


if __name__=='__main__':
    PrivateCordBot().run()
