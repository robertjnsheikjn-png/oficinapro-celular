# OficinaPro: Gestão + Funilaria

Aplicativo web com duas interfaces que compartilham os dados na mesma conta Supabase:

- Gestão para computador: `/`
- Funilaria para celular: `/funilaria/`

Clientes, veículos, produtos, ordens e pagamentos sincronizam entre os dois apps. O backend novo fica no projeto `OficinaPro Gestão e Funilaria` (`cclxkyorlhomlppmakqq`), na região de São Paulo. A chave publicada no navegador é uma chave publishable; as linhas são protegidas por RLS.

## Primeira utilização

1. Abra um dos apps e crie uma conta com e-mail e senha.
2. Se receber um e-mail de confirmação, confirme e volte ao app.
3. Entre com a mesma conta na Gestão e na Funilaria.

No painel Supabase, configure **Authentication → URL Configuration** com Site URL `https://robertjnsheikjn-png.github.io/oficinapro-celular` e Redirect URL `https://robertjnsheikjn-png.github.io/oficinapro-celular/**` para que os links de confirmação voltem ao app publicado.

## Publicação

O repositório publica com GitHub Pages. A migração `supabase/migrations/20261023165615_create_oficinapro_shared_accounts.sql` cria a tabela compartilhada e políticas RLS para isolar os dados por usuário.
