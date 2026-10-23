# OficinaPro: Gestão + Funilaria

Aplicativo web simples com duas telas distintas que usam a mesma conta Supabase:

- Gestão para computador: `/`
- Funilaria para celular: `/funilaria/`

Os dois apps compartilham clientes, veículos, produtos, ordens e pagamentos. O backend novo fica no projeto `OficinaPro Gestão e Funilaria` (`cclxkyorlhomlppmakqq`), na região de São Paulo. A chave usada no navegador é a publishable key do projeto; ela foi criada para uso público no cliente e as linhas são protegidas por RLS.

## Primeira utilização

1. Abra Gestão ou Funilaria e crie uma conta com e-mail e senha.
2. Se o Supabase pedir confirmação do e-mail, abra o link recebido e volte ao app.
3. Entre com a mesma conta nos dois apps para sincronizar os dados.

## Publicação

O repositório usa GitHub Pages. A branch principal publica as duas rotas acima. A migração `supabase/migrations/202610230001_create_oficinapro_shared_accounts.sql` cria a tabela compartilhada e políticas de RLS para que cada conta só leia e altere sua própria linha.

