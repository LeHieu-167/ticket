package com.ticket.config;

import com.ticket.entity.Role;
import com.ticket.entity.Role.RoleName;
import com.ticket.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * Class này sẽ tự động chạy khi ứng dụng khởi động
 * để khởi tạo các Role mặc định trong database
 * và cập nhật các check constraints cho status columns
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        // Khởi tạo các Role nếu chưa tồn tại
        initRole(RoleName.ROLE_CUSTOMER);
        initRole(RoleName.ROLE_ORGANIZER);
        initRole(RoleName.ROLE_ADMIN);

        // Cập nhật constraints cho status columns
        updateStatusConstraints();
    }

    private void initRole(RoleName roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = new Role();
            role.setName(roleName);
            roleRepository.save(role);
            System.out.println("Đã khởi tạo role: " + roleName);
        }
    }

    /**
     * Cập nhật check constraints cho các status columns
     * để đồng bộ với Java enum values
     */
    private void updateStatusConstraints() {
        try {
            // Cập nhật constraint cho bảng events
            jdbcTemplate.execute("ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check");
            jdbcTemplate.execute(
                "ALTER TABLE events ADD CONSTRAINT events_status_check " +
                "CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'REJECTED', 'STOP_SELLING', 'CANCELLED', 'COMPLETED', 'DELETED'))"
            );
            System.out.println("Đã cập nhật constraint events_status_check");

            // Cập nhật constraint cho bảng orders - status
            jdbcTemplate.execute("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
            jdbcTemplate.execute(
                "ALTER TABLE orders ADD CONSTRAINT orders_status_check " +
                "CHECK (status IN ('PENDING', 'PROCESSING', 'CONFIRMED', 'FAILED', 'EXPIRED', 'CANCELLED'))"
            );
            System.out.println("Đã cập nhật constraint orders_status_check");

            // Cập nhật constraint cho bảng orders - payment_status
            jdbcTemplate.execute("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check");
            jdbcTemplate.execute(
                "ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check " +
                "CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED'))"
            );
            System.out.println("Đã cập nhật constraint orders_payment_status_check");

        } catch (Exception e) {
            System.err.println("Lỗi khi cập nhật constraints: " + e.getMessage());
            // Không throw exception để không ảnh hưởng đến việc khởi động ứng dụng
        }
    }
}

