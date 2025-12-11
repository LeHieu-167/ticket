/**
 * FRONTEND IMPLEMENTATION EXAMPLE
 * Ví dụ cách tích hợp hệ thống JWT + Refresh Token trong React/Vue/Angular
 */

// ============================================================================
// 1. API SERVICE với Axios Interceptor
// ============================================================================

import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080';

// Tạo axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Flag để tránh multiple refresh calls
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

// REQUEST INTERCEPTOR: Thêm Access Token vào mọi request
apiClient.interceptors.request.use(
    (config) => {
        const accessToken = localStorage.getItem('accessToken');
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// RESPONSE INTERCEPTOR: Auto refresh token khi 401
apiClient.interceptors.response.use(
    (response) => {
        // Response OK → return data
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // Nếu lỗi 401 và chưa retry
        if (error.response?.status === 401 && !originalRequest._retry) {
            
            // Nếu đang refresh, đưa request vào queue
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return apiClient(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = localStorage.getItem('refreshToken');

            if (!refreshToken) {
                // Không có refresh token → redirect login
                handleLogout();
                return Promise.reject(error);
            }

            try {
                // Gọi API refresh token
                const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken: refreshToken
                });

                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                // Lưu tokens mới
                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Update header của request ban đầu
                originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

                // Process queue
                processQueue(null, newAccessToken);

                // Retry request ban đầu
                return apiClient(originalRequest);
            } catch (refreshError) {
                // Refresh token cũng fail → Logout
                processQueue(refreshError, null);
                handleLogout();
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        // Lỗi khác 401 → trả về lỗi
        return Promise.reject(error);
    }
);

// Helper: Logout và redirect
const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    window.location.href = '/login';
};

export default apiClient;

// ============================================================================
// 2. AUTH SERVICE - Các hàm xử lý authentication
// ============================================================================

export const authService = {
    /**
     * Đăng nhập
     */
    login: async (username, password) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/login`, {
                username,
                password
            });

            const { accessToken, refreshToken, id, username: user, email, roles } = response.data;

            // Lưu tokens và user info
            localStorage.setItem('accessToken', accessToken);
            localStorage.setItem('refreshToken', refreshToken);
            localStorage.setItem('user', JSON.stringify({ id, username: user, email, roles }));

            return response.data;
        } catch (error) {
            throw error.response?.data?.message || 'Đăng nhập thất bại';
        }
    },

    /**
     * Đăng ký Customer
     */
    registerCustomer: async (userData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register/customer`, userData);
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || 'Đăng ký thất bại';
        }
    },

    /**
     * Đăng ký Organizer
     */
    registerOrganizer: async (userData) => {
        try {
            const response = await axios.post(`${API_BASE_URL}/auth/register/organizer`, userData);
            return response.data;
        } catch (error) {
            throw error.response?.data?.message || 'Đăng ký thất bại';
        }
    },

    /**
     * Đăng xuất
     */
    logout: async (logoutAll = false) => {
        const accessToken = localStorage.getItem('accessToken');
        const refreshToken = localStorage.getItem('refreshToken');

        try {
            // Gọi API logout
            await axios.post(`${API_BASE_URL}/auth/logout`, 
                {
                    refreshToken,
                    logoutAll
                },
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            );
        } catch (error) {
            console.error('Logout error:', error);
            // Vẫn clear localStorage dù API fail
        } finally {
            // Clear localStorage
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user');

            // Redirect về login
            window.location.href = '/login';
        }
    },

    /**
     * Logout khỏi tất cả thiết bị
     */
    logoutAllDevices: async () => {
        return authService.logout(true);
    },

    /**
     * Lấy thông tin user hiện tại
     */
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    },

    /**
     * Kiểm tra đã đăng nhập chưa
     */
    isAuthenticated: () => {
        const accessToken = localStorage.getItem('accessToken');
        return !!accessToken;
    },

    /**
     * Kiểm tra có role không
     */
    hasRole: (role) => {
        const user = authService.getCurrentUser();
        return user?.roles?.includes(role) || false;
    },

    /**
     * Kiểm tra có bất kỳ role nào trong list không
     */
    hasAnyRole: (roles) => {
        const user = authService.getCurrentUser();
        return roles.some(role => user?.roles?.includes(role));
    }
};

// ============================================================================
// 3. REACT HOOKS EXAMPLE
// ============================================================================

import { useState, useEffect, createContext, useContext } from 'react';

// Auth Context
const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load user từ localStorage khi mount
        const currentUser = authService.getCurrentUser();
        setUser(currentUser);
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        const userData = await authService.login(username, password);
        setUser({
            id: userData.id,
            username: userData.username,
            email: userData.email,
            roles: userData.roles
        });
        return userData;
    };

    const logout = async () => {
        await authService.logout();
        setUser(null);
    };

    const logoutAllDevices = async () => {
        await authService.logoutAllDevices();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            logout,
            logoutAllDevices,
            isAuthenticated: !!user,
            hasRole: (role) => user?.roles?.includes(role),
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Hook để sử dụng Auth Context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// ============================================================================
// 4. REACT COMPONENTS EXAMPLE
// ============================================================================

// Login Component
export const LoginPage = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        try {
            await login(username, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err);
        }
    };

    return (
        <form onSubmit={handleSubmit}>
            <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Username"
            />
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
            />
            {error && <div className="error">{error}</div>}
            <button type="submit">Đăng nhập</button>
        </form>
    );
};

// Protected Route Component
export const ProtectedRoute = ({ children, requiredRole }) => {
    const { isAuthenticated, hasRole, loading } = useAuth();

    if (loading) {
        return <div>Loading...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" />;
    }

    if (requiredRole && !hasRole(requiredRole)) {
        return <Navigate to="/unauthorized" />;
    }

    return children;
};

// Usage trong App.js
export const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            {/* Protected routes */}
            <Route path="/dashboard" element={
                <ProtectedRoute>
                    <Dashboard />
                </ProtectedRoute>
            } />
            
            {/* Role-based routes */}
            <Route path="/create-event" element={
                <ProtectedRoute requiredRole="ROLE_ORGANIZER">
                    <CreateEvent />
                </ProtectedRoute>
            } />
            
            <Route path="/admin" element={
                <ProtectedRoute requiredRole="ROLE_ADMIN">
                    <AdminPanel />
                </ProtectedRoute>
            } />
        </Routes>
    );
};

// ============================================================================
// 5. VUE 3 COMPOSITION API EXAMPLE
// ============================================================================

// auth.js (Vue Composable)
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';

const user = ref(null);

export function useAuth() {
    const router = useRouter();

    const isAuthenticated = computed(() => !!user.value);

    const login = async (username, password) => {
        try {
            const userData = await authService.login(username, password);
            user.value = {
                id: userData.id,
                username: userData.username,
                email: userData.email,
                roles: userData.roles
            };
            return userData;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        await authService.logout();
        user.value = null;
        router.push('/login');
    };

    const hasRole = (role) => {
        return user.value?.roles?.includes(role) || false;
    };

    const initAuth = () => {
        const currentUser = authService.getCurrentUser();
        user.value = currentUser;
    };

    return {
        user,
        isAuthenticated,
        login,
        logout,
        hasRole,
        initAuth
    };
}

// ============================================================================
// 6. AUTO REFRESH TIMER (Optional)
// ============================================================================

/**
 * Tự động refresh token trước khi hết hạn
 * (Thay vì chờ 401 mới refresh)
 */
export class TokenRefreshTimer {
    constructor() {
        this.timerId = null;
    }

    start() {
        // Refresh token trước 2 phút khi access token hết hạn
        const REFRESH_BEFORE_MS = 2 * 60 * 1000; // 2 phút
        const ACCESS_TOKEN_EXPIRATION_MS = 30 * 60 * 1000; // 30 phút
        const refreshInterval = ACCESS_TOKEN_EXPIRATION_MS - REFRESH_BEFORE_MS;

        this.timerId = setInterval(async () => {
            const refreshToken = localStorage.getItem('refreshToken');
            
            if (!refreshToken) {
                this.stop();
                return;
            }

            try {
                const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
                    refreshToken
                });

                const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

                localStorage.setItem('accessToken', newAccessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                console.log('Token refreshed automatically');
            } catch (error) {
                console.error('Auto refresh failed:', error);
                this.stop();
                handleLogout();
            }
        }, refreshInterval);
    }

    stop() {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }
    }
}

// Sử dụng:
// const refreshTimer = new TokenRefreshTimer();
// refreshTimer.start(); // Sau khi login
// refreshTimer.stop();  // Khi logout

// ============================================================================
// 7. USAGE EXAMPLES
// ============================================================================

/*

// Example 1: Login
try {
    const result = await authService.login('customer1', '123456');
    console.log('Login success:', result);
    // Redirect to dashboard
} catch (error) {
    console.error('Login failed:', error);
}

// Example 2: Gọi API protected
try {
    const response = await apiClient.get('/api/events');
    console.log('Events:', response.data);
} catch (error) {
    console.error('API error:', error);
}

// Example 3: Logout
await authService.logout();

// Example 4: Logout all devices
await authService.logoutAllDevices();

// Example 5: Check role
if (authService.hasRole('ROLE_ORGANIZER')) {
    console.log('User is organizer');
}

// Example 6: Register
try {
    await authService.registerCustomer({
        username: 'newuser',
        email: 'newuser@example.com',
        password: '123456',
        fullName: 'New User',
        phoneNumber: '0123456789'
    });
    console.log('Register success');
} catch (error) {
    console.error('Register failed:', error);
}

*/

