import { useEffect, useState, type FormEvent } from 'react';
import {
  createAdminUser,
  listAdminUsers,
  patchAdminUser,
} from '../api/client';
import { useAuth } from '../auth/AuthContext';
import type { AdminUser } from '../types/api';
import { ApiError } from '../types/api';
import './AdminUsersPage.css';

export function AdminUsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'user' | 'admin'>('user');
  const [error, setError] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<Record<string, string>>({});

  const refresh = async () => {
    setUsers(await listAdminUsers());
  };

  useEffect(() => {
    void refresh().catch((err) => {
      setError(err instanceof ApiError ? err.message : 'Не удалось загрузить пользователей');
    });
  }, []);

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      await createAdminUser({ username, password, role });
      setUsername('');
      setPassword('');
      setRole('user');
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось создать пользователя');
    }
  };

  const handleToggle = async (item: AdminUser) => {
    setError(null);
    try {
      await patchAdminUser(item.id, { is_active: !item.is_active });
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось изменить статус');
    }
  };

  const handleReset = async (item: AdminUser) => {
    const next = resetPassword[item.id];
    if (!next || next.length < 8) {
      setError('Новый пароль должен быть не короче 8 символов');
      return;
    }
    try {
      await patchAdminUser(item.id, { password: next });
      setResetPassword((current) => ({ ...current, [item.id]: '' }));
      await refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Не удалось сбросить пароль');
    }
  };

  return (
    <section className="admin-page">
      <div className="page-heading">
        <h2>Пользователи</h2>
      </div>
      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}
      <form className="admin-form" onSubmit={(event) => void handleCreate(event)}>
        <input
          placeholder="Логин"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          required
          minLength={3}
        />
        <input
          type="password"
          placeholder="Пароль (от 8 символов)"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
          minLength={8}
        />
        <select value={role} onChange={(event) => setRole(event.target.value as 'user' | 'admin')}>
          <option value="user">user</option>
          <option value="admin">admin</option>
        </select>
        <button className="btn btn--primary" type="submit">
          Создать
        </button>
      </form>

      <div className="table-wrap">
        <table className="jobs-table">
          <thead>
            <tr>
              <th>Логин</th>
              <th>Роль</th>
              <th>Статус</th>
              <th>Пароль</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {users.map((item) => (
              <tr key={item.id}>
                <td>{item.username}</td>
                <td>{item.role}</td>
                <td>{item.is_active ? 'активен' : 'отключён'}</td>
                <td>
                  <input
                    type="password"
                    placeholder="Новый пароль"
                    value={resetPassword[item.id] ?? ''}
                    onChange={(event) =>
                      setResetPassword((current) => ({
                        ...current,
                        [item.id]: event.target.value,
                      }))
                    }
                  />
                </td>
                <td className="admin-actions">
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    onClick={() => void handleReset(item)}
                  >
                    Сбросить
                  </button>
                  <button
                    type="button"
                    className="btn btn--secondary btn--small"
                    disabled={item.id === user?.id}
                    onClick={() => void handleToggle(item)}
                  >
                    {item.is_active ? 'Отключить' : 'Включить'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
