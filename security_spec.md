# Especificação de Segurança Firestore (Phase 0 - TDD)

## 1. Data Invariants (Invariantes de Dados)
1. **Autenticação e E-mail Verificado:** Nenhuma operação de leitura ou escrita em `/users/**` é permitida sem `request.auth != null` e `request.auth.token.email_verified == true`.
2. **Isolamento de PII e Propriedade:** Documentos em `/users/{userId}`, `/users/{userId}/years/{yearId}` e `/users/{userId}/years/{yearId}/notifications/{notificationId}` contêm PII (`email`, `cpfOuCnpj`, `telefone`, `endereco`). Somente o proprietário (`request.auth.uid == userId`) ou o administrador autenticado (`sst10gbm@gmail.com` com `email_verified == true` ou documento em `/admins/{uid}`) podem ler ou gravar.
3. **Integridade Relacional (Master Gate):**
   - Um exercício anual em `/users/{userId}/years/{yearId}` não pode existir sem o documento pai `/users/{userId}` (`exists` ou `existsAfter` em lote).
   - Uma notificação em `/users/{userId}/years/{yearId}/notifications/{notificationId}` não pode existir sem o documento pai `/users/{userId}/years/{yearId}` (`exists` ou `existsAfter` em lote).
   - O campo `ownerUid` deve corresponder exatamente a `userId` e `request.auth.uid`, e `anoExercicio` deve corresponder exatamente a `yearId`.
4. **Imutabilidade e Integridade Temporal:**
   - `createdAt`, `ownerUid`, `id` e `anoExercicio` são imutáveis após a criação.
   - `createdAt == request.time` na criação; `updatedAt == request.time` em toda criação e atualização.
5. **Prevenção de Campos Sombra e Explosão de Custo:**
   - Todos os documentos exigem `keys().hasAll(...)` e `keys().hasOnly(...)` na criação e `affectedKeys().hasOnly(...)` por ação na atualização.
   - Todos os campos string e arrays possuem limites máximos explícitos de tamanho (`.size() <= MAX`).
   - Todos os IDs de documento (`userId`, `yearId`, `notificationId`) validados com `^[a-zA-Z0-9_\-]+$` e tamanho `<= 128`.
6. **List Queries Seguras:**
   - Toda regra `allow list` avalia `resource.data.ownerUid == request.auth.uid` diretamente, proibindo consultas sem filtro de proprietário e sem leituras `get()`/`exists()` em `allow list`.

---

## 2. "Dirty Dozen" Payloads (12 Ataques que Devem Retornar `PERMISSION_DENIED`)

1. **Identity Spoofing on Create:** Usuário A (`uidA`) tenta criar `/users/uidA/years/2026/notifications/proc1` com `"ownerUid": "uidB"`. -> **DENIED**.
2. **Cross-Tenant Read/List:** Usuário B (`uidB`) tenta listar `/users/uidA/years/2026/notifications` (ou fazer `get` de um registro de `uidA`). -> **DENIED**.
3. **Unverified Email Spoofing:** Token com `"email": "sst10gbm@gmail.com"` mas `"email_verified": false` tenta ler ou escrever em `/users/uidAdmin/...`. -> **DENIED**.
4. **Privilege Escalation on User Profile Create:** Novo usuário (`uidX`, email não-admin) tenta criar `/users/uidX` com `"role": "admin"`. -> **DENIED**.
5. **Role Mutation on Update:** Usuário comum tenta atualizar `/users/uidX` alterando `"role"` para `"admin"`. -> **DENIED**.
6. **Shadow / Ghost Field Injection:** Operador tenta criar ou atualizar uma notificação enviando um campo não declarado como `"isVerified": true` ou `"bypassAudit": 1`. -> **DENIED**.
7. **ID Poisoning Attack:** Operador tenta criar documento com ID contendo espaços/caracteres inválidos ou string > 128 bytes (ex: `"../../../../etc/passwd"` ou `"a".repeat(300)`). -> **DENIED**.
8. **Fake Client Timestamp:** Operador envia `"createdAt": "2020-01-01T00:00:00Z"` ou um timestamp diferente de `request.time`. -> **DENIED**.
9. **Immutable Field Overwrite:** Operador tenta atualizar `ownerUid`, `anoExercicio` ou `createdAt` em um registro existente. -> **DENIED**.
10. **Value / Resource Poisoning:** Operador envia `observacoes` com 100 KB (`size() > 4000`) ou `exigencias` com 500 itens (`size() > 100`). -> **DENIED**.
11. **Year Bucket Mismatch:** Operador tenta gravar `"anoExercicio": "2027"` dentro da coleção `/users/uidA/years/2026/notifications/n1`. -> **DENIED**.
12. **Query Trust Bypass (Blanket List):** Cliente tenta executar `getDocs(collection(db, "users/uidA/years/2026/notifications"))` sem cláusula `where("ownerUid", "==", uidA)`. -> **DENIED**.
