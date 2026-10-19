# Collab2Us-Dev
Projeto Collab2Us, uma ferramenta de Colaboração que visa auxiliar e facilitar a Engenharia de Software.


# Configurações do .env Tokens do Google, Miro e Trello:
1. Pra pegar os Tokens do Google é necessário
acessar esse link: https://console.cloud.google.com/
Clickar no botão do lado direito do ícone Google Cloud que é do lado esquerdo da barra de pesquisa.
Após isso, clickar no Botão "Novo Projeto"
E depois de Criar o App, clicka nele e vai no botão "APIs e serviços", depois em "Credenciais" e por último
Clicka em "ID do cliente do OAuth".
Após isso, clickar no botão "Configurar tela de consentimento" se caso aparecer. Daí coloca o nome do app, o seu email, coloca a opção "Externo", coloca o seu email de novo nos dados de contato, e finaliza concluindo.
pega o "Id do cliente" (Que é o CLIENT ID)
pega a "Chave secreta do cliente" (Que é o CLIENT SECRET)
Além disso é necessário colocar na "URIs de redirecionamento autorizados",
o seguinte Link: http://localhost:8080/auth/redirect/google

2. Pra pegar os Tokens do Miro é necessário
acessar esse link: https://developers.miro.com/?utm_source=settings-user-profile#your-apps
Clickar no botão "Create a new App". E depois de Criar o App, vai em "Seus aplicativos"
pega o "Id do Cliente" (Que é o CLIENT ID)
pega o "Segredo do Cliente" (Que é o CLIENT SECRET)
Além disso é necessário colocar na "URI de redirecionamento para OAuth2.0",
o seguinte Link: http://localhost:8080/auth/redirect/miro

3. Pra pegar os Token do Trello é necessário
acessar esse link: https://trello.com/power-ups/admin
Clickar no botão azul "Novo". E depois de Criar o App, vai em "Chave de API"
pega a "Chave de API" (Que é o CLIENT ID)
pega o "Segredo" (Que é o CLIENT SECRET)
Além disso é necessário colocar no "Origens permitidas",
o seguinte Link: http://localhost:8080

4. Renomear o arquivo ".env.example" pra ".env"
Colocar o user e password do teu PostgreSQL. Qualquer coisa dá pra criar pelo próprio PGAdmin do PostgreSQL
Criar um database chamado "Collab2Us"

5. E ao pegar os tokens de CLIENT ID e CLIENT SECRET de cada um, é só colocar eles no arquivo ".env" na pasta raíz do projeto. E o ideal é salvar todos esses Client IDS e Client SECRETS em um bloco de notas pra não perder.





# Comandos úteis pro "npm" ficar atualizado e limpo:
1. Limpar o cache do "npm"
com o comando: npm cache clean --force

2. Atualizar o "npm"
com o comando: npm install -g npm@latest --no-cache





# Instalação do Projeto:
1. Abrir o terminal/cmd dentro da pasta raíz do projeto.

2. Instalar todas as dependências
com o comando: npm ci

3. Dar um build pra construir o Collab2Us
com o comando: npm run build

4. Dar um start pra iniciar o Collab2Us
com o comando: npm start

5. Além disso, é necessário instalar o PostgreSQL
através desse Link: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads