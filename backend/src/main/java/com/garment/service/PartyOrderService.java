package com.garment.service;

import com.garment.DTO.PartyOrderDTO;
import com.garment.DTO.SaleOrderDTO;
import com.garment.DTO.SaleOrderRowDTO;
import com.garment.DTO.SaleOrderSizeDetailDTO;
import com.garment.entity.AppOrder;
import com.garment.entity.CustomerRegistration;
import com.garment.model.SaleOrder;
import com.garment.repository.AppOrderRepository;
import com.garment.repository.CustomerRegistrationRepository;
import com.garment.repository.SaleOrderRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

/**
 * Merges orders placed on the WEB (SaleOrder) and via the APP (AppOrder)
 * for a single party, so the broker app can show one combined,
 * newest-first list regardless of where the order came from.
 *
 * A party reaches its app orders indirectly:
 *   Party.id  <-  CustomerRegistration.partyId  <-  AppOrder.customer
 * (a party can have more than one linked customer login, hence the list).
 *
 * WEB orders have no stored total amount on the SaleOrder entity itself,
 * so it's computed here as sum(qty * rate) across every row's size
 * details, reusing SaleOrderService.get(id) (which already assembles
 * rows + sizeDetails) rather than touching SaleOrderRow entities
 * directly. This does one extra lookup per web order — fine for a
 * broker's order list size; revisit with a bulk query if that list
 * ever gets huge.
 */
@Service
public class PartyOrderService {

    private final SaleOrderRepository saleOrderRepo;
    private final SaleOrderService saleOrderService;
    private final AppOrderRepository appOrderRepo;
    private final CustomerRegistrationRepository customerRepo;

    public PartyOrderService(SaleOrderRepository saleOrderRepo,
                              SaleOrderService saleOrderService,
                              AppOrderRepository appOrderRepo,
                              CustomerRegistrationRepository customerRepo) {
        this.saleOrderRepo    = saleOrderRepo;
        this.saleOrderService = saleOrderService;
        this.appOrderRepo     = appOrderRepo;
        this.customerRepo     = customerRepo;
    }

    /**
     * @param partyId  required
     * @param fromDate optional — if null, no lower bound
     * @param toDate   optional — if null, no upper bound
     */
    public List<PartyOrderDTO> getOrdersForParty(Long partyId, LocalDate fromDate, LocalDate toDate) {

        // ── WEB orders ──────────────────────────────────────────────
        List<SaleOrder> webOrders = (fromDate != null && toDate != null)
                ? saleOrderRepo.findByPartyIdAndDatedBetweenOrderByDatedDesc(partyId, fromDate, toDate)
                : saleOrderRepo.findByPartyIdOrderByDatedDesc(partyId);

        List<PartyOrderDTO> webDtos = webOrders.stream()
                .map(this::fromSaleOrder)
                .collect(Collectors.toList());

        // ── APP orders (via linked CustomerRegistration rows) ─────────
        List<Long> customerIds = customerRepo.findByPartyId(partyId).stream()
                .map(CustomerRegistration::getId)
                .collect(Collectors.toList());

        List<AppOrder> appOrders;
        if (customerIds.isEmpty()) {
            appOrders = List.of();
        } else if (fromDate != null && toDate != null) {
            LocalDateTime start = fromDate.atStartOfDay();
            LocalDateTime end   = toDate.atTime(LocalTime.MAX);
            appOrders = appOrderRepo.findByCustomerIdInAndCreatedAtBetweenOrderByCreatedAtDesc(
                    customerIds, start, end);
        } else {
            appOrders = appOrderRepo.findByCustomerIdInOrderByCreatedAtDesc(customerIds);
        }

        List<PartyOrderDTO> appDtos = appOrders.stream()
                .map(this::fromAppOrder)
                .collect(Collectors.toList());

        // ── Merge + sort newest first (nulls-safe) ─────────────────────
        return java.util.stream.Stream.concat(webDtos.stream(), appDtos.stream())
                .sorted(Comparator.comparing(PartyOrderDTO::getDate,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .collect(Collectors.toList());
    }

    private PartyOrderDTO fromSaleOrder(SaleOrder o) {
        return new PartyOrderDTO(
                o.getId(),
                "WEB",
                o.getOrderNo(),
                o.getDated(),
                computeWebOrderAmount(o.getId()),
                null,           // no status field on SaleOrder today
                null,
                o.getTotalPeti(),
                o.getTotalPcs()
        );
    }

    private PartyOrderDTO fromAppOrder(AppOrder o) {
        return new PartyOrderDTO(
                o.getId(),
                "APP",
                "APP-" + o.getId(),
                o.getCreatedAt() != null ? o.getCreatedAt().toLocalDate() : null,
                o.getTotalAmount(),
                o.getOrderStatus() != null ? o.getOrderStatus().name() : null,
                o.getPaymentStatus() != null ? o.getPaymentStatus().name() : null,
                null,
                null
        );
    }

    // ── Sum(qty * rate) across every row's size details for a web order ──
    private Double computeWebOrderAmount(Long saleOrderId) {
        try {
            SaleOrderDTO dto = saleOrderService.get(saleOrderId);
            if (dto == null || dto.getRows() == null) return null;

            BigDecimal total = BigDecimal.ZERO;
            for (SaleOrderRowDTO row : dto.getRows()) {
                if (row.getSizeDetails() == null) continue;
                for (SaleOrderSizeDetailDTO sd : row.getSizeDetails()) {
                    if (sd.getQty() == null || sd.getRate() == null) continue;
                    total = total.add(sd.getRate().multiply(BigDecimal.valueOf(sd.getQty())));
                }
            }
            return total.doubleValue();
        } catch (Exception e) {
            // Don't let one bad row blow up the whole party order list —
            // just show no amount for that order.
            return null;
        }
    }
}