package com.ticket.config;

import com.ticket.entity.Role;
import com.ticket.entity.Role.RoleName;
import com.ticket.repository.RoleRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Class này sẽ tự động chạy khi ứng dụng khởi động
 * để khởi tạo các Role mặc định trong database
 */
@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        // Khởi tạo các Role nếu chưa tồn tại
        initRole(RoleName.ROLE_CUSTOMER);
        initRole(RoleName.ROLE_ORGANIZER);
        initRole(RoleName.ROLE_ADMIN);
    }

    private void initRole(RoleName roleName) {
        if (roleRepository.findByName(roleName).isEmpty()) {
            Role role = new Role();
            role.setName(roleName);
            roleRepository.save(role);
            System.out.println("Đã khởi tạo role: " + roleName);
        }
    }
}

