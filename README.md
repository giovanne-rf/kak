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

O navegador deve acessar a porta `5173`. As chamadas `/api` e `/uploads` passam pelo frontend e sao encaminhadas para o backend automaticamente.

O backend usa a porta `8000` internamente na maquina servidora. Para acesso de outros computadores, normalmente basta liberar a porta `5173` no firewall. O script abaixo tambem libera `8000` para diagnostico.

Para liberar automaticamente no Windows, abra o PowerShell como Administrador e rode:

```powershell
.\liberar-firewall.ps1
```

Para remover as regras do firewall usando Bash/Git Bash aberto como Administrador:

```bash
bash ./derrubar-firewall.sh
```

Se o navegador de outra maquina mostrar `ERR_CONNECTION_REFUSED`, confirme que voce atualizou o projeto com `git pull` e subiu novamente o sistema. A chamada de login deve aparecer como `/api/auth/login`, sem `:8000`, no console do navegador.

Para diagnostico, teste no navegador dessa outra maquina:

```text
http://IP_DO_SERVIDOR:8000/docs
```

Se essa pagina nao abrir, mas `http://IP_DO_SERVIDOR:5173` abrir, o sistema ainda deve funcionar porque o frontend encaminha as chamadas para o backend. Se `/api/auth/login` continuar tentando `:8000`, o navegador esta com uma versao antiga do frontend em cache ou o projeto ainda nao recebeu o ultimo `git pull`.

## Subir e derrubar tudo

Na pasta raiz do projeto:

```powershell
.\subir-sistema.ps1
```

Para parar backend e frontend:

```powershell
.\derrubar-sistema.ps1
```

Com Bash, Git Bash, Linux ou macOS:

```bash
bash ./subir-sistema.sh
```

Se o script parar em `Subindo backend...`, aguarde ate 30 segundos. Ele esta esperando o backend responder em `/api/health`. Se falhar, o proprio script imprime o conteudo de `.runtime/backend.err.log`.

Para parar:

```bash
bash ./derrubar-sistema.sh
```

## Banco de dados

O SQLite e criado automaticamente em `backend/condominio.db`.

Tabelas:

- `users`: id, nome, usuario, email e senha criptografada por hash bcrypt.
- `users.role`: `admin` pode cadastrar/alterar; `viewer` apenas visualiza.
- `buildings`: id, nome, endereco, foto, sindico e telefone.
- `equipments`: id, edificio, tipo, fabricante, modelo, ip, local de instalacao, login e senha de acesso.

Um edificio possui varios equipamentos, e cada equipamento pertence a somente um edificio.
