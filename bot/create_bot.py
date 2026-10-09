import secrets, string, json
name=input('Nazwa bota: ').strip() or 'Mój bot'
token=secrets.token_urlsafe(36)
print('\nToken bota (zapisz go bezpiecznie):')
print(token)
config={'firebase_service_account':'serviceAccount.json','bot_document_id':'TU_WPISZ_ID_DOKUMENTU_BOTA','poll_seconds':2,'prefix':'!'}
with open('config.example.json','w',encoding='utf-8') as f: json.dump(config,f,ensure_ascii=False,indent=2)
