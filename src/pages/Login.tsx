import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Mail, Lock, LogIn, Hotel, AlertCircle, UserPlus, User, Phone, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storage } from '../services/storage';
import { User as UserType } from '../types';
import { useTenant } from '../TenantContext';
import { useAuth } from '../AuthContext';
import { getDashboardPathForRole, resolveRoleForEmail } from '../services/authService';

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setCurrentUser, signInWithGoogle, isGoogleAuthEnabled } = useAuth();
  const { currentTenant } = useTenant();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);

  const accentColor = currentTenant?.theme?.primaryColor || '#0f172a';

  useEffect(() => {
    if (searchParams.get('error') === 'google') {
      setError('No se pudo completar el inicio de sesión con Google.');
    }
  }, [searchParams]);

  const handleGoogleSignIn = async () => {
    setError('');
    setIsGoogleLoading(true);
    try {
      const { path } = await signInWithGoogle();
      navigate(path);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al conectar con Google.');
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    const users = storage.getUsers();

    if (isLogin) {
      const user = users.find((u) => u.email === email && u.password === password);
      if (user) {
        const userWithRole = { ...user, role: resolveRoleForEmail(user.email) };
        if (userWithRole.role !== user.role) storage.updateUser(userWithRole);
        setCurrentUser(userWithRole);
        navigate(getDashboardPathForRole(userWithRole.role));
      } else {
        setError('Credenciales incorrectas.');
        setIsLoading(false);
      }
    } else {
      if (users.some((u) => u.email === email)) {
        setError('El correo electrónico ya está registrado.');
        setIsLoading(false);
        return;
      }

      const newUser: UserType = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        password,
        name: fullName,
        phone,
        role: resolveRoleForEmail(email),
      };

      storage.saveUser(newUser);
      setSuccess('Cuenta creada con éxito. Ahora puede iniciar sesión.');
      setIsLogin(true);
      setPassword('');
      setFullName('');
      setPhone('');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center px-4 py-12 overflow-hidden pt-28">
      <div className="absolute inset-0 z-0">
        <img
          src={
            currentTenant?.theme?.coverUrl ||
            'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=2000'
          }
          alt="Luxury Hotel"
          className="w-full h-full object-cover scale-110 blur-[2px] transition-all duration-1000"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white/10 backdrop-blur-xl rounded-[3rem] overflow-hidden border border-white/20 shadow-2xl"
      >
        <div
          className="hidden lg:flex flex-col justify-between p-16 text-white transition-colors duration-500"
          style={{
            backgroundColor: currentTenant?.theme?.primaryColor
              ? `${currentTenant.theme.primaryColor}33`
              : 'rgba(15, 23, 42, 0.35)',
          }}
        >
          <div>
            <div className="inline-flex p-4 bg-white/10 rounded-3xl mb-8">
              <Hotel className="h-10 w-10" />
            </div>
            <h2 className="text-5xl font-bold mb-6 leading-tight">
              {currentTenant?.name || 'Experiencias Inolvidables'}
            </h2>
            <p className="text-xl text-white/80 font-light leading-relaxed">
              Únase a nuestra comunidad exclusiva y disfrute de los mejores beneficios en{' '}
              {currentTenant?.name || 'nuestro hotel'}.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-1 w-12 bg-white rounded-full" />
              <span className="text-sm font-bold uppercase tracking-widest">Lujo & Confort</span>
            </div>
            <p className="text-sm text-white/60">
              © {new Date().getFullYear()} {currentTenant?.name || 'Hotel'}. Todos los derechos reservados.
            </p>
          </div>
        </div>

        <div className="bg-white p-10 md:p-16 flex flex-col justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={isLogin ? 'login' : 'register'}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              <div className="space-y-2">
                <h1 className="text-4xl font-bold text-gray-900">{isLogin ? 'Bienvenido' : 'Únete a nosotros'}</h1>
                <p className="text-gray-500">
                  {isLogin
                    ? 'Por favor, introduce tus datos para continuar.'
                    : 'Crea tu cuenta y comienza tu viaje con nosotros.'}
                </p>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-red-50 text-red-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-red-100"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {error}
                </motion.div>
              )}

              {success && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-green-50 text-green-600 p-4 rounded-2xl flex items-center gap-3 text-sm font-medium border border-green-100"
                >
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  {success}
                </motion.div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">
                        Nombre Completo
                      </label>
                      <div className="relative group">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <input
                          type="text"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                          placeholder="Juan Pérez"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Teléfono</label>
                      <div className="relative group">
                        <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                        <input
                          type="tel"
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                          placeholder="+51 999 999 999"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="email"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                      placeholder="ejemplo@hotel.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider ml-1">Contraseña</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
                    <input
                      type="password"
                      required
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-none"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || isGoogleLoading}
                  className="w-full btn-primary !py-5 flex items-center justify-center gap-3 text-lg"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" /> Autenticando...
                    </>
                  ) : isLogin ? (
                    <>
                      <LogIn className="h-5 w-5" /> Iniciar Sesión
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-5 w-5" /> Crear Cuenta
                    </>
                  )}
                </button>
              </form>

              <div className="text-center space-y-6">
                {isGoogleAuthEnabled && (
                  <>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-100" />
                      </div>
                      <div className="relative flex justify-center">
                        <span className="bg-white px-3 text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                          o continúa con
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGoogleSignIn}
                      disabled={isGoogleLoading || isLoading}
                      className="w-full flex items-center justify-center gap-2.5 py-4 px-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-semibold text-sm text-slate-700 disabled:opacity-60"
                    >
                      {isGoogleLoading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Conectando...
                        </>
                      ) : (
                        <>
                          <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                          </svg>
                          Google
                        </>
                      )}
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    setError('');
                    setSuccess('');
                  }}
                  className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                >
                  {isLogin ? (
                    <>
                      ¿No tiene una cuenta?{' '}
                      <span style={{ color: accentColor }} className="font-bold hover:underline">
                        Regístrese aquí
                      </span>
                    </>
                  ) : (
                    <>
                      ¿Ya tiene una cuenta?{' '}
                      <span style={{ color: accentColor }} className="font-bold hover:underline">
                        Inicie sesión
                      </span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
