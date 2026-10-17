# App do aluno — Task 5

App Flutter nativo (iOS/Android), em pt-BR, com acesso do aluno pela academia. Professores e administradores usam o painel web.

## Executar

O ambiente de desenvolvimento deste commit **não tem Flutter nem Dart**. Não foram executados `flutter pub get`, `dart format`, `flutter analyze`, testes de widget ou build mobile. A análise sintática com tree-sitter não substitui esses comandos. Os runners iOS/Android ainda precisam ser gerados, conforme a base da Task 1.

Com Flutter estável que inclua Dart >=3.8:

```sh
cd apps/student
flutter create --platforms=ios,android --project-name bota_o_shape_student .
flutter pub get
dart format lib test
flutter analyze
flutter test
flutter run --dart-define=API_BASE_URL=https://api.sua-academia.example/
```

`API_BASE_URL` é apenas a origem pública da API; não é segredo e não deve conter credenciais. O app usa HTTPS. Para desenvolvimento local nativo, HTTP exige escolha explícita e é restrito a localhost/loopback e ao host do emulador Android:

```sh
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:8000/ --dart-define=ALLOW_INSECURE_LOCAL_API=true
```

Ajuste as permissões de rede locais do runner gerado somente para desenvolvimento. O transporte usa `dart:io`, portanto não suporta Flutter Web.

Para revisão visual fictícia, habilite o botão de demonstração e selecione-o na tela de acesso:

```sh
flutter run --dart-define=STUDENT_DEMO=true
```

Demo vem **desativada**. Falhas de API nunca selecionam demo automaticamente. Os dados demo não têm prescrição real, revisão profissional ou mídia aprovada. O armazenamento demo é em memória e separado da sessão real.

## Armazenamento e configuração nativa

A única dependência de runtime adicionada é [`flutter_secure_storage` 11.2.0](https://pub.dev/packages/flutter_secure_storage). Ela fornece Keychain/armazenamento criptografado para tokens, treino atribuído, preferências, rascunhos de execução e fila de sessões. Configure os runners segundo a documentação do plugin: Android minSdk >=23 e backup desabilitado/exclusão dos dados do plugin (`android:allowBackup="false"`); no iOS, habilite os recursos Keychain necessários ao ambiente de assinatura. Não usar SharedPreferences/arquivos de texto para esses dados. Ainda é necessário validar no dispositivo real; não há lockfile Flutter gerado neste ambiente.

Os tokens ficam em um único registro por origem da API. Cache/fila/rascunhos ficam separados por origem, aluno e tenant; demo usa namespace próprio. Login restaurado exige conexão para listar academias e validar vínculo. Dentro de uma sessão ativa, uma falha de leitura apresenta erro e oferece **Abrir treino salvo neste aparelho**, sem substituir silenciosamente uma resposta da API. A cópia pode estar desatualizada; data de vigência é checada localmente e o servidor revalida vínculo e atribuição no envio. A fila é persistida antes do envio, mantém a chave de idempotência e sobrevive a reinício em modo API. Rascunhos preservam séries e notas ao reabrir o treino. Sair remove os tokens e tenta revogar refresh; os registros pendentes ficam criptografados para o próximo acesso da mesma conta.

## Contratos reais e limites

- Login: `POST /api/user/auth/token/` com e-mail/senha; refresh rotativo em `/api/user/auth/token/refresh/`; revogação em `/api/user/auth/token/revoke/`. Rotação concorrente usa um único refresh e persiste o par novo antes do retry. Nenhum token é colocado em URL, log ou build define.
- Convite: `/api/tenancy/invitations/accept/`; aceitar não autentica. Uma conta preexistente continua usando sua senha atual. Seleção de tenant lê `/api/tenancy/tenants/`, valida o membership ativo com papel `student` e usa `X-Tenant-ID` nas operações autenticadas do tenant.
- Onboarding: campos pessoais opcionais ficam locais; consentimentos independentes usam `/api/tenancy/consents/` e a ação `revoke`. Pular não concede nem revoga consentimento existente. Onboarding e Perfil consultam os consentimentos atuais da API mesmo sem preferências neste aparelho; somente finalidades explicitamente alteradas pelo aluno são gravadas/revogadas. Continuar preserva finalidades não tocadas. Recusar não bloqueia os treinos. Notificações são uma preferência local; entrega/push e solicitação de permissão do SO não estão implementadas.
- Treinos: assignments com `template_detail.days.exercises.sets`; biblioteca/equipamentos/músculos carregados pelos IDs referenciados. Só assignments do aluno autenticado entram na projeção local. Datas e versão são preservadas.
- Sessões: `POST /api/workouts/sessions/`, com `assignment`, `idempotency_key`, UTC, `student_note` e logs aninhados. Histórico vem do mesmo endpoint por GET. A fila compara os campos enviados com a resposta da API, normalizando decimais e timestamps; conflito mantém a cópia local e oferece comparação com histórico, sem sobrescrita ou nova chave automática. A resolução definitiva exige revisão com a academia porque a API não oferece merge/edição de sessão concluída.
- **Gap de substituição:** o backend não tem um campo estruturado para substituição. `ExerciseDraft` mantém `selectedAlternative` e `personalNote` separados. O payload local criptografado também os mantém separados. Somente `workoutPayloadForApi` combina alternativa e nota, com delimitadores explícitos, no campo `ExerciseLog.note`. Séries da alternativa enviam `prescription: null`; os alvos originais não são copiados. O histórico separa os dois blocos ao exibir. Selecionar alternativa nunca altera a nota pessoal.
- **Gap de mídia/variação:** `ExerciseMedia` e `ExerciseVariant` existem no modelo backend, mas não têm endpoints de leitura no router atual. O app não inventa URLs nem reproduz material sem revisão. Exibe fallback textual e avisa quando há variação cujo detalhe não foi exposto. `review_status` da biblioteca não comprova revisão da mídia.
- O backend não expõe datas planejadas de cada sessão. O calendário usa filtro de período do histórico real; não cria um cronograma fictício. Valores anteriores só aparecem para a mesma série prescrita, sem recomendação, progressão automática ou autopreenchimento.
- As abas Progresso/Nutrição expõem pontos de extensão para a próxima tarefa. Esta tarefa implementa acesso, onboarding, perfil e treinos, sem CRUD profissional, billing ou checkout.
- Termos/política/canal de suporte ainda dependem da academia: o app informa essa limitação sem simular aceite jurídico de um texto inexistente. Antes de dados reais, configurar a documentação do tenant, validar a finalidade dos consentimentos com a governança do produto e validar publicação de conteúdo profissional.
