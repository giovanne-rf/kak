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

Para liberar automaticamente no Windows, abra o PowerShell como Administrador e rode:

```powershell
.\liberar-firewall.ps1
```

Se o navegador de outra maquina mostrar `ERR_CONNECTION_REFUSED` em `:8000/api/auth/login`, teste no navegador dessa outra maquina:

```text
http://IP_DO_SERVIDOR:8000/docs
```

Se essa pagina nao abrir, o backend nao esta rodando, o IP usado esta errado, ou o firewall ainda esta bloqueando a porta `8000`.

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
