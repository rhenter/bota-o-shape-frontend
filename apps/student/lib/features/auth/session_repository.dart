import '../../core/api/api_client.dart';
import '../../core/data/student_gateway.dart';

class AcademyAccess {
  const AcademyAccess(this.id, this.name);
  final String id, name;
}

class SessionRepository {
  SessionRepository(this.client);
  final ApiClient client;

  Future<List<AcademyAccess>> restore() async {
    if (!await client.restore()) return [];
    return academies();
  }

  Future<List<AcademyAccess>> login(String email, String password) async {
    await client.login(email, password);
    return academies();
  }

  Future<List<AcademyAccess>> academies() async {
    // Listing available academies must not invalidate an existing gateway.
    final items = await client.list('api/tenancy/tenants/');
    return items
        .map((t) => AcademyAccess(t['id'] as String, t['name'] as String))
        .toList();
  }

  Future<ApiStudentGateway> activate(AcademyAccess academy) async {
    final previousTenant = client.tenantId;
    client.tenantId = academy.id;
    try {
      // JWT claim identifies the candidate account; server membership confirms access.
      final userId = client.userId;
      final memberships = await client.list('api/tenancy/memberships/');
      final valid = memberships.any(
        (m) =>
            m['user'] == userId &&
            m['status'] == 'active' &&
            (m['roles'] as List<dynamic>).contains('student'),
      );
      if (!valid) {
        throw const ApiFailure(
          'Este app é exclusivo para alunos com vínculo ativo. A equipe usa o painel web.',
          status: 403,
        );
      }
      final profile =
          (await client.request('GET', 'api/user/users/$userId/'))!
              as Map<String, dynamic>;
      final name = '${profile['first_name']} ${profile['last_name']}'.trim();
      return ApiStudentGateway(
        client: client,
        store: client.store,
        identity: StudentIdentity(
          id: userId,
          tenantId: academy.id,
          name: name.isEmpty ? 'Aluno' : name,
          academy: academy.name,
        ),
      );
    } catch (_) {
      client.tenantId = previousTenant;
      rethrow;
    }
  }

  Future<void> acceptInvite({
    required String token,
    required String password,
    required String firstName,
  }) async {
    await client.request(
      'POST',
      'api/tenancy/invitations/accept/',
      authenticated: false,
      body: {'token': token, 'password': password, 'first_name': firstName},
    );
    // Acceptance is not authentication. Existing users retain their current password.
  }

  Future<void> passwordReset(String email) async {
    await client.request(
      'POST',
      'api/user/auth/password-reset/',
      authenticated: false,
      body: {'email': email},
    );
  }

  Future<void> logout() => client.logout();
}
