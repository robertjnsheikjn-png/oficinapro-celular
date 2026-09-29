"""Ponte HTTPS do celular para as contas individuais existentes no PostgreSQL."""
import json
import os
import secrets
import threading
import time
import uuid
from decimal import Decimal
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from secure_database import SecureDatabase
from database import DatabaseError

CONFIG = {"project": os.environ["DB_PROJECT"], "host": os.environ["DB_HOST"],
          "port": int(os.environ.get("DB_PORT", "5432"))}
ORIGIN = os.environ["APP_ORIGIN"].rstrip("/")
SESSIONS, ATTEMPTS = {}, {}
LOCK = threading.Lock()
TTL = 1800
TABLES = ('clients', 'assets', 'products', 'stock_moves', 'service_orders',
          'order_items', 'payments', 'direct_sales', 'settings')

def connect(user, password):
    return SecureDatabase(CONFIG, user, password)

def prune():
    current = time.monotonic()
    for key in list(SESSIONS):
        if SESSIONS[key]['expires'] <= current:
            del SESSIONS[key]
    for key in list(ATTEMPTS):
        if ATTEMPTS[key][0] < current - 600:
            del ATTEMPTS[key]

def login(user, password, address):
    if not isinstance(user, str) or not isinstance(password, str) or not user.strip() or len(user)>80 or len(password)>512:
        raise ValueError('Informe login e senha válidos.')
    with LOCK:
        prune()
        first, count = ATTEMPTS.get(address, (time.monotonic(), 0))
        if count >= 10 or len(SESSIONS) >= 250 or len(ATTEMPTS) >= 5000:
            raise ValueError('Aguarde alguns minutos antes de tentar novamente.')
        ATTEMPTS[address] = (first, count+1)
    db = connect(user.strip(), password)
    try:
        session = db.refresh_session()
    finally:
        db.close()
    token = secrets.token_urlsafe(32)
    with LOCK:
        prune()
        SESSIONS[token] = {'user':user.strip(), 'password':password, 'expires':time.monotonic()+TTL}
    return {'token':token, 'expires_in':TTL, 'session':session}

def auth(token):
    with LOCK:
        prune()
        saved = SESSIONS.get(token)
        if not saved:
            raise PermissionError('Entre novamente. Sua sessão expirou.')
        return saved.copy()

def snapshot(db):
    session = db.refresh_session()
    seller = session.get('profile') == 'seller'
    allowed = {'products','settings','direct_sales'} if seller else set(TABLES)
    stores = {}
    with db.transaction(snapshot=True):
        for table in TABLES:
            stores[table] = db.query('SELECT * FROM '+table+' ORDER BY '+('key' if table=='settings' else 'id')) if table in allowed else []
        returns = db.query('SELECT * FROM sale_returns ORDER BY id')
    return {'session':session, 'stores':stores, 'sale_returns':returns}

def checkout(db, body):
    request_id = str(uuid.UUID(body['request_id']))
    items = body.get('items')
    if not isinstance(items,list) or not 1 <= len(items) <= 100:
        raise ValueError('Confira os itens da venda.')
    for item in items:
        if not isinstance(item,dict) or not isinstance(item.get('product_id'),int) or item['product_id']<=0:
            raise ValueError('Produto inválido.')
        for field in ('quantity','unit_price'):
            value = Decimal(str(item.get(field)))
            if not value.is_finite() or value < 0 or (field=='quantity' and value==0):
                raise ValueError('Quantidade ou preço inválido.')
    method = body.get('method','')
    if method not in ('PIX','Dinheiro','Cartão','Transferência','Outro'):
        raise ValueError('Forma de pagamento inválida.')
    note = body.get('note','')
    if not isinstance(note,str) or len(note)>2000:
        raise ValueError('Observação inválida.')
    return db.checkout(items, '', method, note, request_id=request_id)

class Handler(BaseHTTPRequestHandler):
    def log_message(self, *args):
        # Nunca grava headers, dados de login ou URLs autenticadas.
        pass

    def send(self, status, data):
        raw=json.dumps(data,default=str,ensure_ascii=False,allow_nan=False).encode()
        self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.send_header('Content-Length',str(len(raw)))
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        if self.headers.get('Origin') == ORIGIN:
            self.send_header('Access-Control-Allow-Origin',ORIGIN)
            self.send_header('Vary','Origin')
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        if self.headers.get('Origin') != ORIGIN:
            return self.send(403,{'error':'Origem não permitida.'})
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin',ORIGIN)
        self.send_header('Access-Control-Allow-Methods','GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers','Authorization, Content-Type')
        self.end_headers()

    def do_GET(self):
        if self.path=='/health':
            return self.send(200,{'status':'ok','service':'OficinaPro'})
        self.handle_api()

    def do_POST(self):
        self.handle_api()

    def handle_api(self):
        db=None
        try:
            if self.headers.get('Origin') not in (None, ORIGIN):
                return self.send(403,{'error':'Origem não permitida.'})
            body={}
            if self.command=='POST':
                size=int(self.headers.get('Content-Length','0'))
                if size<=0 or size>65536 or self.headers.get('Content-Type','').split(';')[0]!='application/json':
                    return self.send(400,{'error':'Requisição inválida.'})
                body=json.loads(self.rfile.read(size))
                if not isinstance(body,dict):
                    raise ValueError('Requisição inválida.')
            if self.path=='/api/login' and self.command=='POST':
                return self.send(200,login(body.get('username'),body.get('password'),self.client_address[0]))
            header=self.headers.get('Authorization','')
            if not header.startswith('Bearer '):
                raise PermissionError('Entre no sistema.')
            token=header[7:]
            saved=auth(token)
            if self.path=='/api/logout' and self.command=='POST':
                with LOCK:
                    SESSIONS.pop(token,None)
                return self.send(200,{'ok':True})
            db=connect(saved['user'],saved['password'])
            if self.path=='/api/snapshot' and self.command=='GET':
                return self.send(200,snapshot(db))
            if self.path=='/api/checkout' and self.command=='POST':
                return self.send(200,{'result':checkout(db,body)})
            self.send(404,{'error':'Operação não disponível.'})
        except PermissionError as exc:
            self.send(401,{'error':str(exc)})
        except DatabaseError:
            self.send(400,{'error':'Confira login, senha, permissões e conexão com o banco.'})
        except (ValueError,KeyError,TypeError,ArithmeticError):
            self.send(400,{'error':'Confira os dados enviados.'})
        except Exception:
            self.send(503,{'error':'Não foi possível concluir. Tente novamente.'})
        finally:
            if db:
                db.close()

if __name__=='__main__':
    ThreadingHTTPServer(('0.0.0.0',int(os.environ.get('PORT','8000'))),Handler).serve_forever()
