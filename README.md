# Sistema de gestao de dispositivos em condominios

Projeto inicial com backend em Python/FastAPI, banco SQLite e frontend em React.

## Credenciais iniciais

- Usuario: `admin`
- Senha: `Admin@123`

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

A API fica em `http://127.0.0.1:8000`.

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

O app fica em `http://127.0.0.1:5173`.

Em outra maquina na mesma rede, acesse pelo IP do computador que esta rodando o sistema, por exemplo:

```text
http://192.168.0.10:5173
```

O backend usa a porta `8000`. Libere as portas `5173` e `8000` no firewall do Windows quando for acessar de outro computador.

## Subir e derrubar tudo

Na pasta raiz do projeto:

```powershell
.\subir-sistema.ps1
```

Para parar backend e frontend:

```powershell
.\derrubar-sistema.ps1
```

## Banco de dados

O SQLite e criado automaticamente em `backend/condominio.db`.

Tabelas:

- `users`: id, nome, usuario, email e senha criptografada por hash bcrypt.
- `users.role`: `admin` pode cadastrar/alterar; `viewer` apenas visualiza.
- `buildings`: id, nome, endereco, foto, sindico e telefone.
- `equipments`: id, edificio, tipo, fabricante, modelo, ip, local de instalacao, login e senha de acesso.

Um edificio possui varios equipamentos, e cada equipamento pertence a somente um edificio.
